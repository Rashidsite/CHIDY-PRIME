export const dynamic = 'force-dynamic';
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

    // Check payment status (accept completed, approved, paid, or unlocked)
    const statusStr = String(order.status || '').toLowerCase();
    const paymentStatusStr = String(order.payment_status || '').toLowerCase();
    const isPaid = ['completed', 'approved', 'paid', 'success'].includes(statusStr) ||
                   ['completed', 'approved', 'paid', 'success'].includes(paymentStatusStr) ||
                   order.unlocked === true;

    if (!isPaid) {
      return NextResponse.json(
        { success: false, error: 'Payment is pending. Please complete payment to access downloads.' },
        { status: 402 }
      );
    }

    let finalDownloadUrl = order.download_url;

    // Fallback: If download_url on order is empty, retrieve from posts table
    if (!finalDownloadUrl && (order.game_id || order.product_id)) {
      try {
        const { data: postRecord } = await supabase
          .from('posts')
          .select('download_url, links')
          .eq('id', order.game_id || order.product_id)
          .maybeSingle();

        if (postRecord) {
          finalDownloadUrl = postRecord.links?.[0]?.url || postRecord.download_url || '';
        }
      } catch {}
    }

    if (!finalDownloadUrl) {
      return NextResponse.json(
        { success: false, error: 'No download file configured for this game.' },
        { status: 404 }
      );
    }

    // Redirect to high-speed file destination
    return NextResponse.redirect(finalDownloadUrl);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
