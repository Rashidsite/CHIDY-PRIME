export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { POST as handleCheckout } from '@/app/api/checkout/route';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const normalizedBody = {
      game_id: rawBody.game_id || rawBody.productId || rawBody.product_id || rawBody.gameId,
      visitor_phone: rawBody.visitor_phone || rawBody.phone || rawBody.phoneNumber || rawBody.phone_number,
      customer_name: rawBody.customer_name || rawBody.name || rawBody.buyerName || 'Mteja wa Mtandaoni',
      payment_gateway: rawBody.payment_gateway || rawBody.gateway || 'pressopay',
    };

    const nextReq = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(normalizedBody),
    });

    return handleCheckout(nextReq);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Payment initiation endpoint ready. Use POST.' });
}
