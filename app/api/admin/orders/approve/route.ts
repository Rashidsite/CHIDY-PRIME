export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Normalize any phone format → 255XXXXXXXXX
function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '255' + digits.slice(1);
  if (digits.length === 9) return '255' + digits;
  return digits;
}

// Duration → expiry date
function getExpiresAt(duration?: string): string {
  const now = new Date();
  if (!duration) {
    now.setFullYear(now.getFullYear() + 10);
    return now.toISOString(); // Lifetime = 10 years
  }
  const lower = duration.toLowerCase();
  if (lower.includes('lifetime') || lower.includes('maisha')) {
    now.setFullYear(now.getFullYear() + 10);
    return now.toISOString();
  }
  if (lower.includes('30')) { now.setDate(now.getDate() + 30); return now.toISOString(); }
  if (lower.includes('7'))  { now.setDate(now.getDate() + 7);  return now.toISOString(); }
  if (lower.includes('24') || lower.includes('siku')) { now.setHours(now.getHours() + 24); return now.toISOString(); }
  if (lower.includes('2h') || lower.includes('masaa 2')) { now.setHours(now.getHours() + 2); return now.toISOString(); }
  // Default: Lifetime
  now.setFullYear(now.getFullYear() + 10);
  return now.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Accept id, orderId, order_id, orderNumber, order_number — any of them
    const orderId = String(
      body.id || body.orderId || body.order_id ||
      body.orderNumber || body.order_number || ''
    ).trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── 1. FIND THE ORDER in payment_orders ───────────────────────────────────
    let order: any = null;

    // Try by UUID id first
    if (orderId.includes('-') && orderId.length === 36) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, links), visitors(id, name, phone)')
        .eq('id', orderId)
        .maybeSingle();
      if (data) order = data;
    }

    // If not found by UUID, try by promo_used (CPCG-XXXXX)
    if (!order) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, links), visitors(id, name, phone)')
        .ilike('promo_used', `%${orderId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) order = data;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order '${orderId}' not found in database.` },
        { status: 404 }
      );
    }

    console.log(`[Admin Approve] ✅ Found order: ${order.id} | Phone: ${order.phone_number} | Product: ${order.posts?.title}`);

    // ── 2. COLLECT ORDER DATA ─────────────────────────────────────────────────
    const rawPhone = order.phone_number || order.visitors?.phone || '';
    const phone = normalizePhone(rawPhone);
    const localPhone = phone.replace(/^255/, '0');
    const productTitle = order.posts?.title || 'Digital Product';
    const productId = order.post_id;
    const downloadLinks = order.posts?.links || [];
    const orderRef = order.promo_used?.split('|')[0] || String(order.id);
    const accessDuration = body.accessDuration || 'Lifetime';
    const expiresAt = getExpiresAt(accessDuration);

    // ── 3. UPDATE payment_orders → approved ───────────────────────────────────
    const { error: updateErr } = await supabase
      .from('payment_orders')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error('[Admin Approve] payment_orders update error:', updateErr.message);
    }

    // ── 4. UPDATE xx_orders → completed ──────────────────────────────────────
    try {
      await supabase
        .from('xx_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .or(`reference_id.eq.${orderRef},reference_id.eq.${order.id}`);
    } catch {}

    // ── 5. UPDATE xx_users.access_until ──────────────────────────────────────
    // Try all phone formats because xx_users may store any format
    try {
      const { data: existingUser } = await supabase
        .from('xx_users')
        .select('id, phone')
        .or(`phone.eq.${phone},phone.eq.${localPhone},phone.eq.+${phone}`)
        .limit(1)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('xx_users')
          .update({ access_until: expiresAt })
          .eq('id', existingUser.id);
      } else {
        // Create user if not exists
        await supabase
          .from('xx_users')
          .insert({
            name: order.visitors?.name || 'Mteja',
            phone: phone,
            access_until: expiresAt,
            created_at: new Date().toISOString(),
          });
      }
    } catch (e) {
      console.warn('[Admin Approve] xx_users update warning:', e);
    }

    // ── 6. BROADCAST UNLOCK TO ALL CHANNELS ──────────────────────────────────
    const broadcastPayload = {
      orderId: String(order.id),
      orderNumber: orderRef,
      orderRef: orderRef,
      productId,
      productTitle,
      phone,
      customerName: order.visitors?.name || 'Mteja',
      status: 'UNLOCKED',
      isApproved: true,
      accessDuration,
      accessExpiresAt: expiresAt,
      downloadLinks,
      unlockedAt: new Date().toISOString(),
    };

    const channelNames = [
      'admin-orders',
      'cross-domain-storefront-sync',
      'storefront-sync',
    ];

    for (const chName of channelNames) {
      try {
        const ch = supabase.channel(chName);
        await ch.subscribe();
        await ch.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
        await ch.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
        supabase.removeChannel(ch);
      } catch {}
    }

    // Per-order modal channel for customer waiting screen
    try {
      const modalCh = supabase.channel(`order_broadcast_modal_${order.id}`);
      await modalCh.subscribe();
      await modalCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      await modalCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
      supabase.removeChannel(modalCh);
    } catch {}

    console.log(`[Admin Approve] 🎉 Order ${order.id} approved. Game unlocked for ${phone}.`);

    return NextResponse.json({
      success: true,
      message: `✅ Order ${orderRef} approved. Game access unlocked for ${phone}.`,
      order: {
        ...order,
        status: 'approved',
        download_links: downloadLinks,
        access_expires_at: expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[Admin Approve] 💥 Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
