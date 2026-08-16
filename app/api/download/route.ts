import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Download token is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Query order by download_token
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('download_token', token)
      .single();

    if (error || !order) {
      return NextResponse.json({ success: false, error: 'Invalid or expired download token' }, { status: 404 });
    }

    // Check token expiration
    if (order.token_expires_at && new Date(order.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Download link has expired. Please contact support.' },
        { status: 403 }
      );
    }

    // Check payment status
    if (order.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Payment is pending. Please complete payment to access downloads.' },
        { status: 402 }
      );
    }

    if (!order.download_url) {
      return NextResponse.json(
        { success: false, error: 'No download file configured for this game.' },
        { status: 404 }
      );
    }

    // Redirect to high-speed file destination
    return NextResponse.redirect(order.download_url);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
