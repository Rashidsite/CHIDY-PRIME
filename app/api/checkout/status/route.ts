import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/payment-gateway';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id') || searchParams.get('ref');
    const phone = cleanPhoneNumber(searchParams.get('phone'));

    const supabase = createAdminClient();

    let order = null;
    if (orderId) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${orderId},order_number.eq.${orderId},transaction_ref.eq.${orderId}`)
        .maybeSingle();
      order = data;
    }

    if (!order && phone) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`visitor_phone.eq.${phone},phone_number.eq.${phone}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      order = data;
    }

    const isCompleted = order && ['completed', 'approved', 'paid'].includes((order.status || '').toLowerCase());

    let links: any[] = [];
    if (order && isCompleted) {
      const prodId = order.game_id || order.product_id;
      const { data: gData } = await supabase.from('games').select('*').eq('id', prodId).maybeSingle();
      const { data: pData } = await supabase.from('posts').select('*').eq('id', prodId).maybeSingle();
      links = parseUniversalDownloadLinks({ ...gData, ...pData, ...order });
    }

    return NextResponse.json({
      success: true,
      is_completed: !!isCompleted,
      status: order?.status || 'pending',
      order,
      download_links: links,
      activation_key: order?.activation_key,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
