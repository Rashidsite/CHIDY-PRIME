import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { cleanPhoneNumber } from '@/lib/payment-gateway';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref') || searchParams.get('order_id') || searchParams.get('order_number');
    const rawPhone = searchParams.get('phone') || searchParams.get('phone_number');
    const phone = cleanPhoneNumber(rawPhone);

    if (!ref && !phone) {
      return NextResponse.json({ success: false, error: 'Reference or phone required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let query = supabase.from('orders').select('*');
    if (ref) {
      query = query.or(`id.eq.${ref},order_number.eq.${ref},transaction_ref.eq.${ref},gateway_reference.eq.${ref}`);
    } else if (phone) {
      query = query.or(`visitor_phone.eq.${phone},phone_number.eq.${phone}`).order('created_at', { ascending: false });
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return NextResponse.json({
        success: true,
        is_completed: false,
        status: 'pending',
        message: 'Order not completed yet',
      });
    }

    const status = (order.status || '').toLowerCase();
    const isCompleted = ['completed', 'approved', 'paid'].includes(status);

    let links: any[] = [];
    if (isCompleted && order.game_id) {
      const { data: gameData } = await supabase.from('games').select('*').eq('id', order.game_id).maybeSingle();
      const { data: postData } = await supabase.from('posts').select('*').eq('id', order.game_id).maybeSingle();
      links = parseUniversalDownloadLinks({ ...gameData, ...postData, ...order });
    }

    return NextResponse.json({
      success: true,
      is_completed: isCompleted,
      status: order.status,
      order,
      download_links: links,
      download_token: order.download_token,
      activation_key: order.activation_key,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
