export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { formatTzPhone, toLocalPhone } from '@/lib/payment-gateway';

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
    // 1. FETCH TARGET ORDER (From payment_orders primary or orders)
    // ──────────────────────────────────────────────────────────────────────────
    let order: any = null;
    const isUuid = orderId.includes('-') && orderId.length === 36;

    // Check payment_orders first
    try {
      const { data: poData } = await supabase
        .from('payment_orders')
        .select('*, posts(*), visitors(*)')
        .or(`id.eq.${isUuid ? orderId : '00000000-0000-0000-0000-000000000000'},promo_used.ilike.%${orderId}%`)
        .limit(1)
        .maybeSingle();

      if (poData) {
        order = {
          ...poData,
          id: poData.id,
          game_id: poData.post_id,
          product_id: poData.post_id,
          visitor_phone: poData.phone_number || poData.visitors?.phone,
          customer_name: poData.visitors?.name,
          order_number: poData.promo_used?.split('|')[0] || poData.id,
        };
      }
    } catch {}

    if (!order) {
      try {
        const { data: oData } = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${isUuid ? orderId : '00000000-0000-0000-0000-000000000000'},order_number.eq.${orderId}`)
          .maybeSingle();

        if (oData) {
          order = oData;
        }
      } catch {}
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order with reference '${orderId}' not found in database.` },
        { status: 404 }
      );
    }

    const rawPhone = order.visitor_phone || order.phone_number || '';
    const cleanPhone = formatTzPhone(rawPhone);
    const localPhone = toLocalPhone(rawPhone);
    const productId = order.game_id || order.product_id;

    // ──────────────────────────────────────────────────────────────────────────
    // 2. RETRIEVE PRODUCT DETAILS & DOWNLOAD LINKS
    // ──────────────────────────────────────────────────────────────────────────
    let productTitle = order.game_title || 'Premium Game';
    let durationType = body.accessDuration || order.access_duration || 'Lifetime';
    let downloadLinks: any[] = [];

    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (postData) {
      if (postData.title) productTitle = postData.title;
      downloadLinks = parseUniversalDownloadLinks(postData);
    }

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
        .eq('id', order.id);
    } catch {}

    // Step B: Update in xx_orders & xx_users
    try {
      await supabase
        .from('xx_orders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .or(`reference_id.eq.${order.order_number},reference_id.eq.${order.id}`);
    } catch {}

    try {
      await supabase
        .from('xx_users')
        .update({
          access_until: expiresAt || new Date(Date.now() + 3650 * 24 * 3600 * 1000).toISOString(),
        })
        .or(`phone.eq.${cleanPhone},phone.eq.${localPhone}`);
    } catch {}

    // Step C: Update in orders (if table exists)
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

    // ──────────────────────────────────────────────────────────────────────────
    // 4. TRIGGER REALTIME BROADCASTS
    // ──────────────────────────────────────────────────────────────────────────
    const broadcastPayload = {
      orderId: String(order.id),
      orderNumber: order.order_number || String(order.id),
      orderRef: order.order_number || String(order.id),
      productId: productId,
      phone: cleanPhone,
      customerName: order.customer_name || order.visitors?.name || 'Mteja',
      productTitle: productTitle,
      status: 'UNLOCKED',
      isApproved: true,
      accessDuration: durationType,
      accessExpiresAt: expiresAt,
      downloadLinks: downloadLinks,
      unlockedAt: new Date().toISOString(),
    };

    // Admin Channel
    try {
      const adminCh = supabase.channel('admin-orders');
      await adminCh.subscribe();
      await adminCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      await adminCh.send({ type: 'broadcast', event: 'ORDER_UPDATED', payload: broadcastPayload });
      supabase.removeChannel(adminCh);
    } catch {}

    // Storefront Channels
    try {
      const syncChannel = supabase.channel('cross-domain-storefront-sync');
      await syncChannel.subscribe();
      await syncChannel.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
      await syncChannel.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      supabase.removeChannel(syncChannel);
    } catch {}

    try {
      const storefrontCh = supabase.channel('storefront-sync');
      await storefrontCh.subscribe();
      await storefrontCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
      supabase.removeChannel(storefrontCh);
    } catch {}

    try {
      const modalCh = supabase.channel(`order_broadcast_modal_${order.id}`);
      await modalCh.subscribe();
      await modalCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      supabase.removeChannel(modalCh);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number || order.id} approved successfully. Game access unlocked for ${cleanPhone}.`,
      order: { ...order, status: 'approved', payment_status: 'completed', download_links: downloadLinks },
    });
  } catch (error: any) {
    console.error('[Admin Approve] 💥 Fatal Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error during order approval' },
      { status: 500 }
    );
  }
}
