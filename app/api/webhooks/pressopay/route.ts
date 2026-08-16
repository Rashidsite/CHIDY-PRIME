import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('PressoPay Webhook Payload Received:', body);

    const { reference, status, transaction_id, phone } = body;

    if (!reference) {
      return NextResponse.json({ success: false, message: 'Missing reference' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check payment status from webhook payload
    const isSuccessful = status === 'SUCCESS' || status === 'COMPLETED' || status === 'APPROVED' || status === 'PAID';

    if (isSuccessful) {
      // 1. Update `orders` table matching reference or order_number
      const { data: updatedOrder, error: orderErr } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          transaction_ref: transaction_id || reference,
          updated_at: new Date().toISOString(),
        })
        .or(`order_number.eq.${reference},transaction_ref.eq.${reference}`)
        .select()
        .single();

      // 2. Also update legacy `payment_orders` if applicable
      await supabase
        .from('payment_orders')
        .update({ status: 'approved' })
        .ilike('promo_used', `%${reference}%`);

      console.log(`✅ Automated Payment Webhook Verified! Order ${reference} completed.`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('PressoPay Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
