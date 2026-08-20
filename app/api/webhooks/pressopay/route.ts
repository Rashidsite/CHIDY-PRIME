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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[PressoPay Webhook] Received payload:', JSON.stringify(body));

    const supabase = createAdminClient();

    // ── 1. Extract fields from PressoPay callback ─────────────────────────────
    // PressoPay sends different field names — handle all variants
    const status = (
      body.status ||
      body.transaction_status ||
      body.payment_status ||
      body.Status ||
      ''
    ).toUpperCase();

    const gatewayRef = (
      body.reference ||
      body.transaction_id ||
      body.transactionId ||
      body.payment_reference ||
      body.id ||
      body.Reference ||
      ''
    ).toString();

    const rawPhone = (
      body.phone ||
      body.msisdn ||
      body.customer_phone ||
      body.phone_number ||
      body.Phone ||
      ''
    ).toString();

    const amount = Number(
      body.amount ||
      body.paid_amount ||
      body.transaction_amount ||
      body.Amount ||
      0
    );

    const orderRef = (
      body.order_id ||
      body.orderId ||
      body.order_number ||
      body.externalId ||
      body.external_id ||
      body.reference ||
      ''
    ).toString();

    console.log(`[PressoPay Webhook] Status: ${status} | GatewayRef: ${gatewayRef} | OrderRef: ${orderRef} | Phone: ${rawPhone}`);

    // ── 2. Only process SUCCESS / COMPLETED ──────────────────────────────────
    const isSuccess = ['SUCCESS', 'COMPLETED', 'SUCCESSFUL', 'PAID', 'APPROVED', 'COMPLETE'].includes(status);
    const isFailed = ['FAILED', 'REJECTED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(status);

    if (!isSuccess && !isFailed) {
      return NextResponse.json({ success: true, message: `Status ${status} acknowledged, no action taken.` });
    }

    // ── 3. Find the order ─────────────────────────────────────────────────────
    // Try multiple strategies to find the correct payment_order
    let targetOrder: any = null;

    // Strategy A: Match by gateway reference in promo_used (e.g. "PP:PAY-xxx" or "CPCG-xxx|PP:PAY-xxx")
    if (gatewayRef) {
      const { data: byRef } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, links), visitors(id, name, phone)')
        .ilike('promo_used', `%${gatewayRef}%`)
        .limit(1)
        .maybeSingle();
      if (byRef) targetOrder = byRef;
    }

    // Strategy B: Match by CPCG order ref in promo_used
    if (!targetOrder && orderRef && orderRef.startsWith('CPCG-')) {
      const { data: byCpcg } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, links), visitors(id, name, phone)')
        .ilike('promo_used', `%${orderRef}%`)
        .limit(1)
        .maybeSingle();
      if (byCpcg) targetOrder = byCpcg;
    }

    // Strategy C: Match by phone number (latest pending order for this phone)
    if (!targetOrder && rawPhone) {
      const cleanPhone = normalizePhone(rawPhone);
      const localPhone = cleanPhone.replace(/^255/, '0');
      const { data: byPhone } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, links), visitors(id, name, phone)')
        .in('status', ['pending', 'processing'])
        .or(
          `phone_number.eq.${cleanPhone},phone_number.eq.${localPhone},phone_number.eq.+${cleanPhone}`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byPhone) targetOrder = byPhone;
    }

    if (!targetOrder) {
      console.warn(`[PressoPay Webhook] ⚠️ Order not found for ref=${gatewayRef}, phone=${rawPhone}`);
      return NextResponse.json({
        success: false,
        error: 'Order not found in database',
        ref: gatewayRef,
        phone: rawPhone,
      }, { status: 404 });
    }

    console.log(`[PressoPay Webhook] ✅ Found order: ${targetOrder.id} | Ref: ${targetOrder.promo_used}`);

    const phone = normalizePhone(targetOrder.phone_number || rawPhone);
    const localPhone = phone.replace(/^255/, '0');
    const productTitle = targetOrder.posts?.title || 'Digital Product';
    const productId = targetOrder.post_id;

    // ── 4. Handle FAILED ─────────────────────────────────────────────────────
    if (isFailed) {
      await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          promo_used: targetOrder.promo_used?.includes('|') ? targetOrder.promo_used : `${targetOrder.promo_used}|${gatewayRef}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetOrder.id);

      return NextResponse.json({ success: true, message: 'Order marked rejected.' });
    }

    // ── 5. Handle SUCCESS — Update all tables ────────────────────────────────

    // A. Update payment_orders
    await supabase
      .from('payment_orders')
      .update({
        status: 'approved',
        promo_used: targetOrder.promo_used?.includes('|')
          ? targetOrder.promo_used
          : `${targetOrder.promo_used}|${gatewayRef || 'PP:auto'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetOrder.id);

    // B. Update xx_orders
    try {
      const orderRef2 = targetOrder.promo_used?.split('|')[0] || targetOrder.id;
      await supabase
        .from('xx_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .or(`reference_id.eq.${orderRef2},reference_id.eq.${targetOrder.id}`);
    } catch {}

    // C. Update xx_users access — give Lifetime access (10 years)
    try {
      const accessUntil = new Date(Date.now() + 3650 * 24 * 3600 * 1000).toISOString();
      await supabase
        .from('xx_users')
        .update({ access_until: accessUntil })
        .or(`phone.eq.${phone},phone.eq.${localPhone},phone.eq.+${phone}`);
    } catch {}

    // ── 6. Broadcast to all Realtime channels ────────────────────────────────
    const broadcastPayload = {
      orderId: String(targetOrder.id),
      orderNumber: targetOrder.promo_used?.split('|')[0] || String(targetOrder.id),
      orderRef: targetOrder.promo_used?.split('|')[0] || String(targetOrder.id),
      productId,
      productTitle,
      phone,
      status: 'UNLOCKED',
      isApproved: true,
      downloadLinks: targetOrder.posts?.links || [],
      unlockedAt: new Date().toISOString(),
    };

    const channels = [
      'admin-orders',
      'cross-domain-storefront-sync',
      'storefront-sync',
    ];

    for (const chName of channels) {
      try {
        const ch = supabase.channel(chName);
        await ch.subscribe();
        await ch.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
        await ch.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
        supabase.removeChannel(ch);
      } catch {}
    }

    // Also broadcast to per-order modal channel
    try {
      const modalCh = supabase.channel(`order_broadcast_modal_${targetOrder.id}`);
      await modalCh.subscribe();
      await modalCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      await modalCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
      supabase.removeChannel(modalCh);
    } catch {}

    console.log(`[PressoPay Webhook] 🎉 Order ${targetOrder.id} APPROVED. Broadcasts sent.`);

    return NextResponse.json({
      success: true,
      message: `Order ${targetOrder.id} marked approved. Game unlocked for ${phone}.`,
    });
  } catch (error: any) {
    console.error('[PressoPay Webhook] 💥 Fatal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Health check & manual test endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'PressoPay Callback Ready', timestamp: new Date().toISOString() });
}
