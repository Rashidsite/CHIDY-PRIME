export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingWebhookPayload, fulfillOrderApproval } from '@/lib/payment-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const payload = await parseIncomingWebhookPayload(request);
    console.log('[HarakaPay Webhook] 📥 Received payload:', JSON.stringify(payload));

    const status = String(payload.status || payload.state || '').trim().toLowerCase();
    const isSuccess = ['completed', 'success', 'approved', 'paid', '00', 'ok'].includes(status);

    const desc = String(payload.description || payload.title || payload.desc || '').trim();
    const descMatch = desc.match(/CPCG-[A-Z0-9]+/i);

    const rawRef = String(
      payload.merchant_reference ||
      payload.merchantReference ||
      payload.reference ||
      payload.order_number ||
      payload.orderNumber ||
      (descMatch ? descMatch[0] : '') ||
      payload.order_id ||
      payload.orderId ||
      payload.id ||
      ''
    ).trim();

    // Strip repush attempt suffix (e.g. CPCG-X97VWK-P2 -> CPCG-X97VWK)
    const cleanBaseRef = rawRef.replace(/-P\d+$/i, '').trim();

    const phone = String(
      payload.phone ||
      payload.phone_number ||
      payload.customer_phone ||
      payload.msisdn ||
      payload.buyerPhone ||
      payload.data?.phone ||
      ''
    ).trim();

    if (!isSuccess) {
      return NextResponse.json({ success: true, message: `HarakaPay status "${status || 'EMPTY'}" noted without unlock.` });
    }

    const targetRef = cleanBaseRef || rawRef;
    if (!targetRef || targetRef.length < 3) {
      return NextResponse.json({ success: false, error: 'Missing valid order reference' }, { status: 400 });
    }

    const gatewayRef = String(payload.order_id || payload.id || payload.transaction_id || rawRef).trim();

    const result = await fulfillOrderApproval({
      orderIdOrRef: targetRef,
      gatewayRef,
      phone,
      gatewayName: 'HARAKAPAY',
      paidAmount: Number(payload.amount || payload.paid_amount || 0),
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? `HarakaPay order ${result.orderNumber} approved.` : result.error,
    });
  } catch (error: any) {
    console.error('[HarakaPay Webhook] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
