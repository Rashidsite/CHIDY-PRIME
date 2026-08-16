import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';

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

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '255' + digits.substring(1);
  if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length === 9) return '255' + digits;
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.startsWith('0')) return '255' + digits.substring(1);
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = body.id || body.orderId || body.order_id || body.orderNumber || body.order_number;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order identifier is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. FETCH TARGET ORDER
    const { data: order, error: orderFetchErr } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${orderId.includes('-') && orderId.length === 36 ? orderId : '00000000-0000-0000-0000-000000000000'},order_number.eq.${orderId}`)
      .maybeSingle();

    if (orderFetchErr || !order) {
      return NextResponse.json({ success: false, error: `Order '${orderId}' not found.` }, { status: 404 });
    }

    const rawPhone = order.visitor_phone || order.phone_number || '';
    const cleanPhone = normalizePhone(rawPhone);
    const productId = order.game_id || order.product_id;

    if (!cleanPhone || !productId) {
      return NextResponse.json({ success: false, error: 'Order missing phone or product ID.' }, { status: 422 });
    }

    // 2. RETRIEVE PRODUCT DETAILS & DURATION
    let productTitle = order.game_title || 'Premium Game';
    let durationType = body.accessDuration || order.access_duration || 'Lifetime';
    let downloadLinks: any[] = [];

    const { data: gameData } = await supabase.from('games').select('*').eq('id', productId).maybeSingle();
    const { data: postData } = await supabase.from('posts').select('*').eq('id', productId).maybeSingle();
    const merged = { ...gameData, ...postData };
    if (merged.title) productTitle = merged.title;
    if (merged.access_duration && !body.accessDuration) durationType = merged.access_duration;
    downloadLinks = parseUniversalDownloadLinks(merged);

    const expiresAt = calculateExpirationDate(durationType);
    const downloadToken = order.download_token || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 3. STRICT SEQUENTIAL DATABASE UPDATES
    const { data: updatedOrder, error: orderUpdateErr } = await supabase
      .from('orders')
      .update({
        status: 'approved',
        payment_status: 'completed',
        download_token: downloadToken,
        access_duration: durationType,
        access_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (orderUpdateErr) throw new Error(`Orders update failed: ${orderUpdateErr.message}`);

    // Insert into Immutable Payment Ledger
    await supabase.from('payment_transactions').insert({
      order_ref: order.order_number || String(order.id),
      phone_number: cleanPhone,
      product_id: productId,
      amount: order.amount || 0,
      currency: 'TZS',
      gateway: 'manual_admin',
      gateway_ref: `ADM-${Date.now()}`,
      status: 'COMPLETED',
      raw_response: { approved_by: 'admin', approved_at: new Date().toISOString(), manual_override: true },
    });

    // Upsert into user_purchases
    const { error: purchaseErr } = await supabase.from('user_purchases').upsert(
      {
        order_id: String(order.id),
        order_reference: order.order_number || String(order.id),
        user_id: order.user_id || null,
        customer_phone: cleanPhone,
        phone_number: cleanPhone,
        product_id: productId,
        game_id: productId,
        product_title: productTitle,
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

    if (purchaseErr) throw new Error(`User purchases upsert failed: ${purchaseErr.message}`);

    // 4. TRIGGER SUPABASE REALTIME BROADCAST
    try {
      const syncChannel = supabase.channel('storefront-sync');
      await syncChannel.subscribe();
      await syncChannel.send({
        type: 'broadcast',
        event: 'PRODUCT_UNLOCKED',
        payload: {
          phone: cleanPhone,
          productId: productId,
          orderRef: order.order_number || String(order.id),
          productTitle: productTitle,
          status: 'UNLOCKED',
          accessDuration: durationType,
          accessExpiresAt: expiresAt,
          downloadLinks: downloadLinks,
          unlockedAt: new Date().toISOString(),
        },
      });
      supabase.removeChannel(syncChannel);
    } catch (realtimeErr) {
      console.warn('[Admin Approve] ⚠️ Realtime broadcast warning:', realtimeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number || order.id} approved successfully. Game unlocked for ${cleanPhone}.`,
      order: updatedOrder || order,
    });
  } catch (error: any) {
    console.error('[Admin Approve] 💥 Fatal Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
