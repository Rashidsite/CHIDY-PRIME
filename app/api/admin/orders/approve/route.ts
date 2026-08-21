export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrderApproval } from '@/lib/payment-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const orderId = String(
      body.id ||
      body.orderId ||
      body.order_id ||
      body.orderNumber ||
      body.order_number ||
      ''
    ).trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const accessDuration = body.accessDuration || body.duration || 'Lifetime';

    const result = await fulfillOrderApproval({
      orderIdOrRef: orderId,
      accessDuration,
      gatewayName: 'ADMIN_MANUAL',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Order could not be approved' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `✅ Order ${result.orderNumber || orderId} approved. Game access unlocked for ${result.phone}.`,
      order: result.order,
    });
  } catch (error: any) {
    console.error('[Admin Approve] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
