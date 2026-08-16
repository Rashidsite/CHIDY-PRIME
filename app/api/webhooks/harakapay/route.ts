import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, reference, status } = body;
    const ref = reference || order_id;

    if (!ref) {
      return NextResponse.json({ success: false, message: 'Missing reference' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (status === 'COMPLETED' || status === 'SUCCESS') {
      await supabase
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('order_number', ref);
    }

    return NextResponse.json({ success: true, message: 'HarakaPay webhook processed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
