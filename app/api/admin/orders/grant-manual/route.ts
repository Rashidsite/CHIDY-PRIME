import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { cleanPhoneNumber } from '@/lib/payment-gateway';

function calculateExpirationDate(duration?: string): string | null {
  if (!duration || duration.toLowerCase().includes('lifetime') || duration.toLowerCase().includes('maisha')) {
    return null;
  }
  const now = new Date();
  const lower = duration.toLowerCase();

  if (lower.includes('30 day') || lower.includes('mwezi') || lower.includes('30')) {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }
  if (lower.includes('7 day') || lower.includes('wiki') || lower.includes('7')) {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }
  if (lower.includes('24 hour') || lower.includes('siku 1') || lower.includes('24')) {
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  }
  if (lower.includes('2 hour') || lower.includes('masaa 2') || lower.includes('2h')) {
    now.setHours(now.getHours() + 2);
    return now.toISOString();
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      gameId,
      productId: rawProductId,
      customerPhone: rawPhone,
      customerName: rawName,
      paymentSource: rawSource,
      accessDuration: rawDuration,
      amount: rawAmount,
      notes,
    } = body;

    const productId = gameId || rawProductId;
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Tafadhali chagua mchezo (Game/Mod).' }, { status: 400 });
    }

    if (!rawPhone || String(rawPhone).trim().length < 8) {
      return NextResponse.json({ success: false, error: 'Tafadhali weka namba sahihi ya simu ya mteja.' }, { status: 400 });
    }

    const cleanPhone = cleanPhoneNumber(String(rawPhone).trim());
    const customerName = String(rawName || 'Mteja wa WhatsApp / Nje').trim();
    const paymentSource = String(rawSource || 'WhatsApp Direct').trim();
    const durationType = String(rawDuration || 'Lifetime').trim();

    const supabase = createAdminClient();

    let gameTitle = 'Digital Game Access';
    let gamePrice = Number(rawAmount) || 0;
    let downloadLinks: any[] = [];

    const { data: gameData } = await supabase.from('games').select('*').eq('id', productId).maybeSingle();
    const { data: postData } = await supabase.from('posts').select('*').eq('id', productId).maybeSingle();
    const merged = { ...gameData, ...postData };

    if (merged.title) gameTitle = merged.title;
    if (merged.price && !rawAmount) gamePrice = Number(merged.price);
    downloadLinks = parseUniversalDownloadLinks(merged);

    const orderNumber = 'CPCG-M' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const downloadToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = calculateExpirationDate(durationType);

    let createdOrderRecord: any = null;

    try {
      const { data: createdOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          visitor_phone: cleanPhone,
          phone_number: cleanPhone,
          customer_name: customerName,
          game_id: productId,
          product_id: productId,
          game_title: gameTitle,
          amount: gamePrice,
          currency: 'TZS',
          status: 'approved',
          payment_status: 'completed',
          payment_gateway: paymentSource,
          gateway_reference: `MANUAL-${Date.now()}`,
          download_token: downloadToken,
          access_duration: durationType,
          access_expires_at: expiresAt,
          metadata: {
            manual_grant: true,
            granted_by: 'admin',
            payment_source: paymentSource,
            notes: notes || 'Manual grant for offline customer',
          },
        })
        .select()
        .maybeSingle();

      if (!orderErr && createdOrder) {
        createdOrderRecord = createdOrder;
      }
    } catch (e: any) {
      console.warn('[Grant Manual] orders table insert bypassed:', e?.message);
    }

    try {
      const { data: legacyOrder, error: legacyErr } = await supabase
        .from('payment_orders')
        .insert({
          visitor_id: Math.floor(Math.random() * 10000),
          post_id: productId,
          amount: gamePrice,
          phone_number: cleanPhone,
          status: 'approved',
          promo_used: orderNumber,
        })
        .select()
        .maybeSingle();

      if (!createdOrderRecord && legacyOrder) {
        createdOrderRecord = legacyOrder;
      }
    } catch (e: any) {
      console.warn('[Grant Manual] payment_orders insert warning:', e?.message);
    }

    try {
      await supabase.from('profiles').upsert(
        {
          phone_number: cleanPhone,
          full_name: customerName,
          role: 'user',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone_number' }
      );
    } catch {}

    try {
      await supabase.from('xx_users').upsert(
        {
          phone: cleanPhone,
          name: customerName,
          role: 'user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );
    } catch {}

    try {
      await supabase.from('payment_transactions').insert({
        order_ref: orderNumber,
        phone_number: cleanPhone,
        product_id: productId,
        amount: gamePrice,
        currency: 'TZS',
        gateway: paymentSource,
        gateway_ref: `MANUAL-${Date.now()}`,
        status: 'COMPLETED',
        raw_response: {
          manual_grant: true,
          granted_at: new Date().toISOString(),
          customer_name: customerName,
          payment_source: paymentSource,
        },
      });
    } catch (e: any) {
      console.warn('[Grant Manual] payment_transactions insert warning:', e?.message);
    }

    try {
      await supabase.from('user_purchases').upsert(
        {
          order_id: String(createdOrderRecord?.id || orderNumber),
          order_reference: orderNumber,
          customer_phone: cleanPhone,
          phone_number: cleanPhone,
          product_id: productId,
          game_id: productId,
          product_title: gameTitle,
          download_links: downloadLinks,
          download_token: downloadToken,
          access_duration: durationType,
          access_expires_at: expiresAt,
          status: 'active',
          unlocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_phone,product_id' }
      );
    } catch (e: any) {
      console.warn('[Grant Manual] user_purchases upsert warning:', e?.message);
    }

    try {
      const channel = supabase.channel('storefront-sync');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'PRODUCT_UNLOCKED',
        payload: {
          phone: cleanPhone,
          productId: productId,
          orderRef: orderNumber,
          productTitle: gameTitle,
          status: 'UNLOCKED',
          accessDuration: durationType,
          accessExpiresAt: expiresAt,
          downloadLinks: downloadLinks,
          unlockedAt: new Date().toISOString(),
        },
      });
      supabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn('[Grant Manual] ⚠️ Realtime broadcast warning:', realtimeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Access imefunguliwa kikamilifu kwa ${customerName} (${cleanPhone})!`,
      order: createdOrderRecord || { order_number: orderNumber, customer_phone: cleanPhone },
    });
  } catch (error: any) {
    console.error('[Grant Manual] 💥 Fatal Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Kumetokea hitilafu wakati wa kumpa mteja access.' },
      { status: 500 }
    );
  }
}
