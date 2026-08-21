export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseIncomingWebhookPayload, fulfillOrderApproval, normalizePhone } from '@/lib/payment-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const payload = await parseIncomingWebhookPayload(request);
    console.log('[PressoPay Webhook] 📥 Received callback payload:', JSON.stringify(payload));

    const status = String(
      payload.status ||
      payload.transaction_status ||
      payload.payment_status ||
      payload.paymentStatus ||
      payload.Status ||
      payload.state ||
      payload.resultCode ||
      ''
    ).trim().toUpperCase();

    const gatewayRef = String(
      payload.reference ||
      payload.transaction_id ||
      payload.transactionId ||
      payload.payment_reference ||
      payload.id ||
      payload.transid ||
      payload.Reference ||
      ''
    ).trim();

    const rawPhone = String(
      payload.phone ||
      payload.msisdn ||
      payload.buyerPhone ||
      payload.customer_phone ||
      payload.phone_number ||
      payload.Phone ||
      ''
    ).trim();

    const orderRef = String(
      payload.merchantReference ||
      payload.merchant_reference ||
      payload.order_id ||
      payload.orderId ||
      payload.order_number ||
      payload.orderNumber ||
      payload.externalId ||
      payload.external_id ||
      payload.reference_id ||
      payload.orderRef ||
      ''
    ).trim();

    const paidAmount = Number(
      payload.amountMinor
        ? Number(payload.amountMinor) / (payload.amountMinor > 100000 ? 100 : 1)
        : payload.amount || payload.paid_amount || payload.Amount || 0
    );

    console.log(`[PressoPay Webhook] 🔍 Status: ${status} | GatewayRef: ${gatewayRef} | OrderRef: ${orderRef} | Phone: ${rawPhone}`);

    // Check completion status
    const isSuccess = [
      'SUCCESS',
      'COMPLETED',
      'SUCCESSFUL',
      'PAID',
      'APPROVED',
      'COMPLETE',
      'OK',
      '00',
      'TRUE',
    ].includes(status);

    const isExplicitFailed = [
      'FAILED',
      'REJECTED',
      'CANCELLED',
      'CANCELED',
      'EXPIRED',
      'USER_CANCELLED',
      'INSUFFICIENT_BALANCE',
    ].includes(status);

    // ── Handle explicit failure ──
    if (isExplicitFailed && !isSuccess) {
      console.warn(`[PressoPay Webhook] ⚠️ Order rejected by gateway: ${orderRef || gatewayRef}`);
      const supabase = createAdminClient();
      if (orderRef || gatewayRef) {
        await supabase
          .from('payment_orders')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .or(`promo_used.ilike.%${orderRef || gatewayRef}%`);
      }
      return NextResponse.json({ success: true, message: 'Order marked rejected per gateway signal.' });
    }

    if (!isSuccess && status) {
      console.log(`[PressoPay Webhook] ℹ️ Non-terminal status "${status}" acknowledged.`);
      return NextResponse.json({
        success: true,
        message: `Status "${status}" acknowledged, awaiting final confirmation.`,
      });
    }

    // ── Execute Master Fulfillment Pipeline ──
    const result = await fulfillOrderApproval({
      orderIdOrRef: orderRef || gatewayRef,
      gatewayRef,
      phone: rawPhone,
      gatewayName: 'PRESSOPAY',
      paidAmount,
    });

    if (!result.success) {
      console.warn(`[PressoPay Webhook] ⚠️ Fulfillment lookup note: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
        orderRef,
        gatewayRef,
      }, { status: 200 }); // Return 200 to prevent gateway retry storm
    }

    return NextResponse.json({
      success: true,
      message: `✅ Order ${result.orderNumber} successfully approved and game access unlocked.`,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      phone: result.phone,
    });
  } catch (error: any) {
    console.error('[PressoPay Webhook] 💥 Fatal Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
