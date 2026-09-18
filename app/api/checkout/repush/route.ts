export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { routePayment, formatTzPhone, normalizePressoPayPhone } from '@/lib/payment-gateway';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, order_number, phone, amount, title, attempt = 2 } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const formattedPhone = formatTzPhone(phone);
    const orderRef = String(order_number || order_id || '').trim();

    // 1. Check if order is ALREADY paid — if so, abort pushes immediately
    if (order_id || orderRef) {
      const { data: existingPo } = await supabase
        .from('payment_orders')
        .select('id, status')
        .or(`id.eq.${order_id || '00000000-0000-0000-0000-000000000000'},promo_used.ilike.${orderRef}%`)
        .limit(1)
        .maybeSingle();

      const poStatus = String(existingPo?.status || '').toLowerCase();
      if (['completed', 'approved', 'paid', 'success'].includes(poStatus)) {
        return NextResponse.json({
          success: true,
          is_paid: true,
          message: 'Order already completed and paid',
        });
      }

      const { data: existingOrd } = await supabase
        .from('orders')
        .select('id, status, payment_status')
        .or(`id.eq.${order_id || '00000000-0000-0000-0000-000000000000'},order_number.eq.${orderRef}`)
        .limit(1)
        .maybeSingle();

      const ordStatus = String(existingOrd?.status || existingOrd?.payment_status || '').toLowerCase();
      if (['completed', 'approved', 'paid', 'success'].includes(ordStatus)) {
        return NextResponse.json({
          success: true,
          is_paid: true,
          message: 'Order already completed and paid',
        });
      }
    }

    // 2. Dispatch the repeat STK Push prompt (Fast Dispatch)
    const numAmount = Number(amount || 0);
    const pushOrderNum = `${orderRef || 'REP'}-P${attempt}`;

    console.log(`[RePush ⚡] Dispatching push #${attempt}/4 to ${formattedPhone} for order ${orderRef} (TZS ${numAmount})...`);

    // Alternate gateways on retries to ensure delivery across different network USSD channels
    const preferredGateway = attempt % 2 === 0 ? 'harakapay' : 'pressopay';

    const gatewayResult = await routePayment({
      amount: numAmount,
      phone: formattedPhone,
      orderNumber: pushOrderNum,
      description: `Chidy Prime (Push ${attempt}/4) - ${title || 'Game Order'}`,
      preferredGateway,
    });

    console.log(`[RePush ⚡] Push #${attempt}/4 dispatched via ${gatewayResult.gateway}. Status: ${gatewayResult.status}`);

    return NextResponse.json({
      success: true,
      is_paid: false,
      attempt,
      gateway: gatewayResult.gateway,
      message: `Push #${attempt} ya malipo imetumwa kwenye simu yako.`,
    });
  } catch (err: any) {
    console.error('[RePush ⚡] Error re-triggering push:', err);
    return NextResponse.json({ success: false, error: err.message || 'Push dispatch failed' }, { status: 500 });
  }
}
