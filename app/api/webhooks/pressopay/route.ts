export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';
import { formatTzPhone } from '@/lib/payment-gateway';

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

    const status = String(body.status || body.payment_status || body.data?.status || body.data?.payment_status || '').toUpperCase();
    const phone = formatTzPhone(body.phone || body.buyerPhone || body.phone_number || body.data?.phone || body.data?.buyerPhone || '');

    if (!reference && !transactionId) {
      return NextResponse.json({ success: false, message: 'Missing reference' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isSuccessful = ['SUCCESS', 'COMPLETED', 'APPROVED', 'PAID', 'OK', 'COMPLETE'].includes(status);

    if (isSuccessful) {
      const isUuid = reference && reference.includes('-') && reference.length === 36;
      const { data: targetOrder } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.eq.${reference || ''},id.eq.${isUuid ? reference : '00000000-0000-0000-0000-000000000000'},transaction_ref.eq.${transactionId || reference || ''},gateway_reference.eq.${transactionId || reference || ''},gateway_reference.eq.${reference || ''}`)
        .maybeSingle();

      if (targetOrder) {
        const effectivePhone = formatTzPhone(targetOrder.visitor_phone || targetOrder.phone_number || phone);
        const productId = targetOrder.game_id || targetOrder.product_id;
        const durationType = targetOrder.access_duration || 'Lifetime';
        const expiresAt = calculateExpirationDate(durationType);

        let links: any[] = [];
        let productTitle = targetOrder.game_title || 'Premium Game';

        if (productId) {
          const { data: gData } = await supabase.from('games').select('*').eq('id', productId).maybeSingle();
          const { data: pData } = await supabase.from('posts').select('*').eq('id', productId).maybeSingle();
          const merged = { ...gData, ...pData, ...targetOrder };
          if (merged.title) productTitle = merged.title;
          links = parseUniversalDownloadLinks(merged);
        }

        // 1. Update orders table
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_ref: transactionId || reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetOrder.id);

        // 2. Fulfill user_purchases
        await supabase.from('user_purchases').upsert(
          {
            order_id: String(targetOrder.id),
            order_reference: targetOrder.order_number || String(targetOrder.id),
            user_id: targetOrder.user_id || null,
            customer_phone: effectivePhone,
            phone_number: effectivePhone,
            product_id: productId,
            game_id: productId,
            product_title: productTitle,
            download_links: links,
            download_token: targetOrder.download_token,
            access_duration: durationType,
            access_expires_at: expiresAt,
            status: 'active',
            unlocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'customer_phone,product_id' }
        );

        // 3. Multi-channel Realtime Broadcast
        const broadcastPayload = {
          phone: effectivePhone,
          productId: productId,
          orderId: String(targetOrder.id),
          orderNumber: targetOrder.order_number || String(targetOrder.id),
          orderRef: targetOrder.order_number || String(targetOrder.id),
          productTitle: productTitle,
          status: 'UNLOCKED',
          accessDuration: durationType,
          accessExpiresAt: expiresAt,
          downloadLinks: links,
          downloadToken: targetOrder.download_token,
          activationKey: targetOrder.activation_key,
          unlockedAt: new Date().toISOString(),
        };

        try {
          const ch1 = supabase.channel('cross-domain-storefront-sync');
          await ch1.subscribe();
          await ch1.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
          await ch1.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
          supabase.removeChannel(ch1);
        } catch (e) {}

        try {
          const ch2 = supabase.channel('storefront-sync');
          await ch2.subscribe();
          await ch2.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
          supabase.removeChannel(ch2);
        } catch (e) {}

        try {
          const ch3 = supabase.channel(`order_broadcast_modal_${targetOrder.id}`);
          await ch3.subscribe();
          await ch3.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
          supabase.removeChannel(ch3);
        } catch (e) {}

        notifySuccessfulPayment({
          id: targetOrder.id,
          order_number: targetOrder.order_number || String(targetOrder.id),
          amount: targetOrder.amount || 0,
          game_title: productTitle,
          visitor_phone: effectivePhone,
          payment_gateway: 'PRESSOPAY',
        }).catch(() => {});

        console.log(`✅ [PressoPay Webhook] Order ${reference} fully unlocked for ${effectivePhone}!`);
      }
    }

    return NextResponse.json({ success: true, message: 'PressoPay webhook processed' });
  } catch (error: any) {
    console.error('[PressoPay Webhook] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
