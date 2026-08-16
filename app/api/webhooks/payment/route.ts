import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';

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
    const rawPayload = await request.json().catch(() => ({}));
    console.log('[Payment Webhook] 📥 Received raw payload:', JSON.stringify(rawPayload));

    const orderRef =
      rawPayload.merchantReference ||
      rawPayload.order_id ||
      rawPayload.order_number ||
      rawPayload.orderNumber ||
      rawPayload.reference ||
      rawPayload.data?.merchantReference ||
      rawPayload.data?.order_id ||
      rawPayload.data?.reference ||
      rawPayload.orderRef;

    const gatewayRef =
      rawPayload.reference ||
      rawPayload.transaction_id ||
      rawPayload.transactionRef ||
      rawPayload.id ||
      rawPayload.data?.reference ||
      rawPayload.data?.id;

    const rawStatus =
      rawPayload.status ||
      rawPayload.payment_status ||
      rawPayload.payment?.status ||
      rawPayload.data?.status ||
      '';

    const normalizedStatus = String(rawStatus).trim().toUpperCase();
    const isSuccess = [
      'COMPLETED',
      'SUCCESS',
      'PAID',
      'APPROVED',
      'OK',
      '00',
      'COMPLETE',
    ].includes(normalizedStatus);

    const buyerPhone = normalizePhone(
      rawPayload.buyerPhone ||
      rawPayload.phone ||
      rawPayload.phone_number ||
      rawPayload.customer_phone ||
      rawPayload.data?.buyerPhone ||
      rawPayload.data?.phone ||
      ''
    );

    const paidAmount = Number(
      rawPayload.amountMinor
        ? Number(rawPayload.amountMinor) / (rawPayload.amountMinor > 100000 ? 100 : 1)
        : rawPayload.amount || rawPayload.data?.amount || 0
    );

    const gatewayName = rawPayload.gateway || (rawPayload.amountMinor ? 'pressopay' : 'harakapay');
    const supabase = createAdminClient();

    // 1. FAIL-SAFE LEDGER: Update or Insert Immutable Payment Transaction
    if (orderRef || gatewayRef) {
      const { data: existingTx } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`order_ref.eq.${orderRef || ''},gateway_ref.eq.${gatewayRef || ''}`)
        .maybeSingle();

      if (existingTx) {
        await supabase
          .from('payment_transactions')
          .update({
            status: isSuccess ? 'COMPLETED' : 'FAILED',
            gateway_ref: gatewayRef || existingTx.gateway_ref,
            raw_response: rawPayload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTx.id);
      } else {
        await supabase.from('payment_transactions').insert({
          order_ref: orderRef || `ORPHAN-${Date.now()}`,
          phone_number: buyerPhone,
          amount: paidAmount,
          currency: 'TZS',
          gateway: gatewayName,
          gateway_ref: gatewayRef,
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          raw_response: rawPayload,
        });
      }
    }

    if (!isSuccess) {
      return NextResponse.json({
        success: true,
        message: `Webhook acknowledged with non-completion status: ${normalizedStatus}`,
      });
    }

    // 2. RETRIEVE ASSOCIATED ORDER
    let targetOrder: any = null;
    if (orderRef || gatewayRef) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.eq.${orderRef || ''},id.eq.${orderRef || '00000000-0000-0000-0000-000000000000'},transaction_ref.eq.${gatewayRef || ''},gateway_reference.eq.${gatewayRef || ''}`)
        .maybeSingle();

      targetOrder = orderData;
    }

    // 3. ZERO-LOSS UNCLAIMED PAYMENTS LEDGER
    if (!targetOrder) {
      await supabase.from('unclaimed_payments').insert({
        transaction_ref: gatewayRef || orderRef || `TX-${Date.now()}`,
        phone_number: buyerPhone,
        amount: paidAmount,
        gateway: gatewayName,
        raw_payload: rawPayload,
        status: 'unclaimed',
        notes: 'Payment confirmed via webhook but matching order was not found at execution time.',
      });

      return NextResponse.json({
        success: true,
        message: 'Payment recorded to unclaimed ledger.',
      });
    }

    // 4. ATOMIC ORDER STATUS UPDATE
    const effectivePhone = targetOrder.visitor_phone || targetOrder.phone_number || buyerPhone;
    const cleanPhone = normalizePhone(effectivePhone);
    const productId = targetOrder.game_id || targetOrder.product_id;
    const downloadToken = targetOrder.download_token || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let productTitle = targetOrder.game_title || 'Premium Game';
    let durationType = targetOrder.access_duration || 'Lifetime';
    let downloadLinks: any[] = [];

    if (productId) {
      const { data: gameData } = await supabase.from('games').select('*').eq('id', productId).maybeSingle();
      const { data: postData } = await supabase.from('posts').select('*').eq('id', productId).maybeSingle();
      const merged = { ...gameData, ...postData };
      if (merged.title) productTitle = merged.title;
      if (merged.access_duration) durationType = merged.access_duration;
      downloadLinks = parseUniversalDownloadLinks(merged);
    }

    const expiresAt = calculateExpirationDate(durationType);

    await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_status: 'completed',
        transaction_ref: gatewayRef || targetOrder.transaction_ref,
        gateway_reference: gatewayRef || targetOrder.gateway_reference,
        payment_gateway: gatewayName,
        download_token: downloadToken,
        access_duration: durationType,
        access_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetOrder.id);

    // 5. ATOMIC ACCESS FULFILLMENT INTO user_purchases
    await supabase.from('user_purchases').upsert(
      {
        order_id: String(targetOrder.id),
        order_reference: targetOrder.order_number || String(targetOrder.id),
        user_id: targetOrder.user_id || null,
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

    // 6. REALTIME STOREFRONT BROADCAST
    try {
      const channel = supabase.channel('storefront-sync');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'PRODUCT_UNLOCKED',
        payload: {
          phone: cleanPhone,
          productId: productId,
          orderRef: targetOrder.order_number || String(targetOrder.id),
          productTitle: productTitle,
          status: 'UNLOCKED',
          accessDuration: durationType,
          accessExpiresAt: expiresAt,
          downloadLinks: downloadLinks,
          unlockedAt: new Date().toISOString(),
        },
      });
      supabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn('[Payment Webhook] ⚠️ Realtime broadcast warning:', realtimeErr);
    }

    // 7. TELEGRAM SALES ALERT
    try {
      await notifySuccessfulPayment({
        id: targetOrder.id,
        order_number: targetOrder.order_number || String(targetOrder.id),
        amount: paidAmount || targetOrder.amount || 0,
        game_title: productTitle,
        visitor_phone: cleanPhone,
        payment_gateway: gatewayName.toUpperCase(),
      });
    } catch (tErr) {
      console.warn('[Payment Webhook] ⚠️ Telegram alert warning:', tErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified, access unlocked, and storefront synced.',
      order_number: targetOrder.order_number,
      product_id: productId,
      customer_phone: cleanPhone,
    });
  } catch (error: any) {
    console.error('[Payment Webhook] 💥 Fatal Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
