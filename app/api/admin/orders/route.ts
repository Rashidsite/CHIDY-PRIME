export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: poData, error: poErr } = await supabase
      .from('payment_orders')
      .select('*, posts(id, title, price, image_url, links), visitors(id, name, phone)')
      .order('created_at', { ascending: false });

    if (poErr) throw poErr;

    const orders = (poData || []).map((o: any) => ({
      ...o,
      order_number: o.promo_used?.split('|')[0] || o.id,
      customer_name: o.visitors?.name || '',
      customer_phone: o.phone_number || o.visitors?.phone || '',
      visitor_phone: o.phone_number || o.visitors?.phone || '',
      product_title: o.posts?.title || 'Digital Product',
      game_title: o.posts?.title || 'Digital Product',
      amount: o.amount || o.posts?.price || 0,
      status: o.status || 'pending',
    }));

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'ID and Status required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Update in payment_orders
    const { data: updated, error } = await supabase
      .from('payment_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, posts(title), visitors(name, phone)')
      .maybeSingle();

    // 2. Also try updating in orders
    try {
      await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch {}

    // 3. Realtime Broadcast
    try {
      const adminCh = supabase.channel('admin-orders');
      await adminCh.subscribe();
      await adminCh.send({
        type: 'broadcast',
        event: 'ORDER_UPDATED',
        payload: { orderId: id, status, updatedAt: new Date().toISOString() },
      });
      supabase.removeChannel(adminCh);
    } catch {}

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
