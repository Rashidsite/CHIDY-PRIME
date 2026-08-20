export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Normalize any phone format → 255XXXXXXXXX
function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '255' + digits.slice(1);
  if (digits.length === 9) return '255' + digits;
  return digits;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // ── PRIMARY QUERY: payment_orders joined with posts and visitors ──────────
    const { data: poData, error: poErr } = await supabase
      .from('payment_orders')
      .select('*, posts(id, title, price, image_url, links), visitors(id, name, phone)')
      .order('created_at', { ascending: false });

    if (poErr) {
      console.error('[Admin Orders GET] payment_orders error:', poErr.message);
      throw poErr;
    }

    const orders = (poData || []).map((o: any) => {
      const orderPhone = normalizePhone(o.phone_number || o.visitors?.phone || '');
      // Order ref: strip the gateway part if promo_used contains "|"
      const orderRef = o.promo_used?.split('|')[0] || String(o.id);

      return {
        ...o,
        // Normalized fields for UI display
        order_number:    orderRef,
        customer_name:   o.visitors?.name || '',
        customer_phone:  orderPhone || o.phone_number || '',
        visitor_phone:   orderPhone || o.phone_number || '',
        // Product details from joined posts
        product_title:   o.posts?.title || 'Digital Product',
        game_title:      o.posts?.title || 'Digital Product',
        product_image:   o.posts?.image_url || '',
        download_links:  o.posts?.links || [],
        // Amount — prefer payment_orders.amount, fallback to posts.price
        amount:          Number(o.amount) || Number(o.posts?.price) || 0,
        status:          o.status || 'pending',
        payment_gateway: o.promo_used?.startsWith('PP:') ? 'pressopay' : 'pressopay',
      };
    });

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

    const { data: updated, error } = await supabase
      .from('payment_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, posts(title), visitors(name, phone)')
      .maybeSingle();

    if (error) throw error;

    // Realtime broadcast
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
