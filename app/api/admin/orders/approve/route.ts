export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';

// ── Duration Parser Helper ──────────────────────────────────────────────────
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

// ── Universal Phone Normalizer ───────────────────────────────────────────────
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
    const orderId = String(body.id || body.orderId || body.order_id || body.orderNumber || body.order_number || '');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order identifier (ID or Order Number) is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. FETCH TARGET ORDER (From orders OR payment_orders)
    // ──────────────────────────────────────────────────────────────────────────
    let order: any = null;
    let isLegacy = false;

    try {
      const { data: oData } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${orderId.includes('-') && orderId.length === 36 ? orderId : '00000000-0000-0000-0000-000000000000'},order_number.eq.${orderId}`)
        .maybeSingle();

      if (oData) {
        order = oData;
      }
    } catch {}

    if (!order) {
      const { data: legacyData } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (legacyData) {
        order = {
          ...legacyData,
          game_id: legacyData.post_id,
          product_id: legacyData.post_id,
          visitor_phone: legacyData.phone_number || legacyData.visitor_phone,
          order_number: legacyData.promo_used || `ORD-${legacyData.id.slice(0, 8)}`,
        };
        isLegacy = true;
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order with reference '${orderId}' not found in database.` },
        { status: 404 }
      );
    }

    const rawPhone = order.visitor_phone || order.phone_number || '';
    const cleanPhone = normalizePhone(rawPhone);
    const productId = order.game_id || order.product_id;

    if (!cleanPhone || !productId) {
      return NextResponse.json(
        { success: false, error: 'Order is missing valid customer phone or product ID.' },
        { status: 422 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. RETRIEVE PRODUCT DETAILS, DURATION, & DOWNLOAD LINKS
    // ──────────────────────────────────────────────────────────────────────────
    let productTitle = order.game_title || 'Premium Game';
    let durationType = body.accessDuration || order.access_duration || 'Lifetime';
    let downloadLinks: any[] = [];

    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    const mergedProduct = { ...gameData, ...postData };
    if (mergedProduct.title) productTitle = mergedProduct.title;
    if (mergedProduct.access_duration && !body.accessDuration) {
      durationType = mergedProduct.access_duration;
    }
    downloadLinks = parseUniversalDownloadLinks(mergedProduct);

    const expiresAt = calculateExpirationDate(durationType);
    const downloadToken =
      order.download_token ||
      `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // ──────────────────────────────────────────────────────────────────────────
    // 3. EXECUTE STRICT UPDATES ACROSS TABLES
    // ──────────────────────────────────────────────────────────────────────────

    // Step A: Update in payment_orders
    try {
      await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    } catch {}

    // Step B: Update in orders (if table exists)
    try {
      await supabase
        .from('orders')
        .update({
          status: 'approved',
          payment_status: 'completed',
          download_token: downloadToken,
          access_duration: durationType,
          access_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    } catch {}

    // Step C: Record in payment_transactions
    try {
      await supabase.from('payment_transactions').insert({
        order_ref: order.order_number || String(order.id),
        phone_number: cleanPhone,
        product_id: productId,
        amount: order.amount || 0,
        currency: 'TZS',
        gateway: 'manual_admin',
        gateway_ref: `ADM-${Date.now()}`,
        status: 'COMPLETED',
        raw_response: {
          approved_by: 'admin',
          approved_at: new Date().toISOString(),
          manual_override: true,
        },
      });
    } catch {}

    // Step D: Upsert into user_purchases
    try {
      await supabase.from('user_purchases').upsert(
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
        {
          onConflict: 'customer_phone,product_id',
        }
      );
    } catch {}

    // ──────────────────────────────────────────────────────────────────────────
    // 4. TRIGGER BROADCASTS
    // ──────────────────────────────────────────────────────────────────────────
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
    } catch {}

    try {
      const legacyChannel = supabase.channel('order-updates');
      await legacyChannel.send({
        type: 'broadcast',
        event: 'ORDER_APPROVED',
        payload: { order_id: order.id, status: 'completed' },
      });
      supabase.removeChannel(legacyChannel);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number || order.id} approved successfully. Game access unlocked for ${cleanPhone}.`,
      order: { ...order, status: 'approved', payment_status: 'completed' },
    });
  } catch (error: any) {
    console.error('[Admin Approve] 💥 Fatal Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error during order approval' },
      { status: 500 }
    );
  }
}
