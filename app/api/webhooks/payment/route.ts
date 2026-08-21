export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingWebhookPayload, fulfillOrderApproval } from '@/lib/payment-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const payload = await parseIncomingWebhookPayload(request);
    console.log('[Generic Payment Webhook] 📥 Received payload:', JSON.stringify(payload));

    const status = String(
      payload.status ||
      payload.payment_status ||
      payload.transaction_status ||
      payload.state ||
      payload.resultCode ||
      ''
    ).trim().toUpperCase();

    const isSuccess = [
      'COMPLETED',
      'SUCCESS',
      'PAID',
      'APPROVED',
      'OK',
      '00',
      'TRUE',
      'COMPLETE',
    ].includes(status);

    const orderRef = String(
      payload.merchantReference ||
      payload.order_id ||
      payload.orderId ||
      payload.order_number ||
      payload.orderNumber ||
      payload.reference ||
      payload.externalId ||
      payload.reference_id ||
      payload.orderRef ||
      ''
    ).trim();

    const gatewayRef = String(
      payload.reference ||
      payload.transaction_id ||
      payload.transactionRef ||
      payload.id ||
      payload.transid ||
      ''
    ).trim();

    const phone = String(
      payload.buyerPhone ||
      payload.phone ||
      payload.phone_number ||
      payload.customer_phone ||
      payload.msisdn ||
      ''
    ).trim();

    const paidAmount = Number(
      payload.amountMinor
        ? Number(payload.amountMinor) / (payload.amountMinor > 100000 ? 100 : 1)
        : payload.amount || payload.paid_amount || 0
    );

    if (!isSuccess && status) {
      return NextResponse.json({
        success: true,
        message: `Webhook received with non-completion status: ${status}`,
      });
    }

    const result = await fulfillOrderApproval({
      orderIdOrRef: orderRef || gatewayRef,
      gatewayRef,
      phone,
      gatewayName: payload.gateway || 'PAYMENT_WEBHOOK',
      paidAmount,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? `Order ${result.orderNumber} fulfilled.` : result.error,
      orderNumber: result.orderNumber,
      orderId: result.orderId,
    });
  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
