export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingWebhookPayload, fulfillOrderApproval } from '@/lib/payment-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const payload = await parseIncomingWebhookPayload(request);
    console.log('[HarakaPay Webhook] 📥 Received payload:', JSON.stringify(payload));

    const status = String(payload.status || payload.state || '').trim().toLowerCase();
    const isSuccess = ['completed', 'success', 'approved', 'paid', '00', 'ok'].includes(status);

    const orderRef = String(payload.reference || payload.order_id || payload.orderId || payload.order_number || '').trim();
    const phone = String(payload.phone || payload.phone_number || '').trim();

    if (!isSuccess && status) {
      return NextResponse.json({ success: true, message: `HarakaPay status ${status} noted.` });
    }

    const result = await fulfillOrderApproval({
      orderIdOrRef: orderRef,
      gatewayRef: orderRef,
      phone,
      gatewayName: 'HARAKAPAY',
      paidAmount: Number(payload.amount || 0),
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
