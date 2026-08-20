export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, status } = body;

    const supabase = createAdminClient();

    if (reference && (status === 'SUCCESS' || status === 'COMPLETED')) {
      await supabase
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .or(`order_number.eq.${reference},id.eq.${reference}`);
    }

    return NextResponse.json({ success: true, message: 'Callback processed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
