export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';
import { formatTzPhone, toLocalPhone } from '@/lib/payment-gateway';

function calculateExpirationDate(days?: number): string {
  const now = new Date();
  if (!days || days === 0) {
    now.setFullYear(now.getFullYear() + 10); // Lifetime
  } else {
    now.setDate(now.getDate() + days);
  }
  return now.toISOString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[PressoPay Webhook] 📥 Payload Received:', body);

    const reference =
      body.reference ||
      body.merchantReference ||
      body.order_number ||
      body.order_id ||
      body.orderRef ||
      body.data?.merchantReference ||
      body.data?.reference ||
      body.data?.order_number;

    const transactionId =
      body.transaction_id ||
      body.transactionRef ||
      body.reference ||
      body.id ||
      body.data?.id ||
      body.data?.transaction_id;

    const status = String(
      body.status || body.payment_status || body.data?.status || body.data?.payment_status || ''
    ).toUpperCase();

    const rawPhone = body.phone || body.buyerPhone || body.phone_number || body.data?.phone || body.data?.buyerPhone || '';
    const intlPhone = formatTzPhone(rawPhone);
    const localPhone = toLocalPhone(rawPhone);

    if (!reference && !transactionId && !intlPhone) {
      return NextResponse.json({ success: false, message: 'Missing reference or phone' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isSuccessful = ['SUCCESS', 'COMPLETED', 'APPROVED', 'PAID', 'OK', 'COMPLETE'].includes(status);

    if (isSuccessful) {
      const isUuid = reference && reference.includes('-') && reference.length === 36;

      // ────────────────────────────────────────────────────────────────────────
      // 1. MATCH ORDER IN payment_orders (Primary Table)
      // ────────────────────────────────────────────────────────────────────────
      let targetOrder: any = null;

      if (reference || transactionId) {
        const refPattern = reference ? `%${reference}%` : '';
        const txnPattern = transactionId ? `%${transactionId}%` : '';

        const { data: poByRef } = await supabase
          .from('payment_orders')
          .select('*, posts(*), visitors(*)')
          .or(`promo_used.ilike.${refPattern || 'NONE'},promo_used.ilike.${txnPattern || 'NONE'}${isUuid ? `,id.eq.${reference}` : ''}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        targetOrder = poByRef;
      }

      // Fallback match by phone if pending
      if (!targetOrder && (intlPhone || localPhone)) {
        const { data: poByPhone } = await supabase
          .from('payment_orders')
          .select('*, posts(*), visitors(*)')
          .or(`phone_number.eq.${intlPhone},phone_number.eq.${localPhone}`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        targetOrder = poByPhone;
      }

      if (targetOrder) {
        const effectivePhone = formatTzPhone(targetOrder.phone_number || intlPhone || targetOrder.visitors?.phone || '');
        const postId = targetOrder.post_id;
        const postData = targetOrder.posts || {};
        const productTitle = postData.title || 'Digital Product';
        const downloadLinks = parseUniversalDownloadLinks(postData);
        const orderRef = targetOrder.promo_used?.split('|')[0] || targetOrder.id;

        // 1. Update payment_orders
        await supabase
          .from('payment_orders')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetOrder.id);

        // 2. Update xx_orders if matching
        try {
          await supabase
            .from('xx_orders')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .or(`reference_id.eq.${orderRef},reference_id.eq.${reference || 'NONE'}`);
        } catch {}

        // 3. Update xx_users access time
        try {
          const expiresAt = calculateExpirationDate(postData.duration_days);
          await supabase
            .from('xx_users')
            .update({ access_until: expiresAt })
            .or(`phone.eq.${effectivePhone},phone.eq.${localPhone}`);
        } catch {}

        // 4. Update orders table (if exists)
        try {
          await supabase
            .from('orders')
            .update({
              status: 'completed',
              payment_status: 'completed',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .or(`order_number.eq.${orderRef},id.eq.${isUuid ? reference : '00000000-0000-0000-0000-000000000000'}`);
        } catch {}

        // ────────────────────────────────────────────────────────────────────────
        // 5. MULTI-CHANNEL REALTIME BROADCAST
        // ────────────────────────────────────────────────────────────────────────
        const broadcastPayload = {
          orderId: String(targetOrder.id),
          orderNumber: orderRef,
          orderRef: orderRef,
          productId: postId,
          phone: effectivePhone,
          customerName: targetOrder.visitors?.name || 'Mteja',
          productTitle: productTitle,
          status: 'UNLOCKED',
          isApproved: true,
          downloadLinks: downloadLinks,
          unlockedAt: new Date().toISOString(),
        };

        // Broadcast to Admin Panel
        try {
          const adminCh = supabase.channel('admin-orders');
          await adminCh.subscribe();
          await adminCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
          await adminCh.send({ type: 'broadcast', event: 'ORDER_UPDATED', payload: broadcastPayload });
          supabase.removeChannel(adminCh);
        } catch {}

        // Broadcast to Storefront
        try {
          const syncCh = supabase.channel('cross-domain-storefront-sync');
          await syncCh.subscribe();
          await syncCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
          await syncCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
          supabase.removeChannel(syncCh);
        } catch {}

        // Broadcast to Modal specific listeners
        try {
          const modalCh = supabase.channel(`order_broadcast_modal_${targetOrder.id}`);
          await modalCh.subscribe();
          await modalCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
          supabase.removeChannel(modalCh);
        } catch {}

        if (orderRef !== targetOrder.id) {
          try {
            const modalRefCh = supabase.channel(`order_broadcast_modal_${orderRef}`);
            await modalRefCh.subscribe();
            await modalRefCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
            supabase.removeChannel(modalRefCh);
          } catch {}
        }

        // Notify Admin via Telegram
        notifySuccessfulPayment({
          id: targetOrder.id,
          order_number: orderRef,
          amount: targetOrder.amount || 0,
          game_title: productTitle,
          visitor_phone: effectivePhone,
          payment_gateway: 'PRESSOPAY',
        }).catch(() => {});

        console.log(`✅ [PressoPay Webhook] Order ${orderRef} (${targetOrder.id}) fully unlocked for ${effectivePhone}!`);
      }
    }

    return NextResponse.json({ success: true, message: 'PressoPay webhook processed' });
  } catch (error: any) {
    console.error('[PressoPay Webhook] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
