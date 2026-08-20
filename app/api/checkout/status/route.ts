export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTzPhone, toLocalPhone, getPressoPayPaymentStatus, getHarakaPayStatus } from '@/lib/payment-gateway';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id') || searchParams.get('ref');
    const rawPhone = searchParams.get('phone');
    const intlPhone = formatTzPhone(rawPhone || '');
    const localPhone = toLocalPhone(rawPhone || '');

    const supabase = createAdminClient();

    let order = null;
    if (orderId) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${orderId},order_number.eq.${orderId},transaction_ref.eq.${orderId},gateway_reference.eq.${orderId}`)
        .maybeSingle();
      order = data;
    }

    if (!order && (intlPhone || localPhone)) {
      const phoneFilter = [
        intlPhone ? `visitor_phone.eq.${intlPhone}` : null,
        localPhone ? `visitor_phone.eq.${localPhone}` : null,
        intlPhone ? `phone_number.eq.${intlPhone}` : null,
        localPhone ? `phone_number.eq.${localPhone}` : null,
      ].filter(Boolean).join(',');

      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(phoneFilter)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      order = data;
    }

    let isCompleted = order && ['completed', 'approved', 'paid'].includes((order.status || '').toLowerCase());

    // If still pending, perform a direct live check with HarakaPay / PressoPay status endpoint
    if (order && !isCompleted && (order.gateway_reference || order.order_number)) {
      const targetRef = order.gateway_reference || order.order_number;
      try {
        // 1. Check HarakaPay
        if (targetRef.startsWith('HP') || order.payment_gateway === 'harakapay') {
          const hStatus = await getHarakaPayStatus(targetRef);
          if (hStatus?.success && hStatus?.payment?.status === 'completed') {
            await supabase
              .from('orders')
              .update({
                status: 'completed',
                payment_status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            order.status = 'completed';
            order.payment_status = 'completed';
            isCompleted = true;
          }
        }

        // 2. Check PressoPay
        if (!isCompleted) {
          const pressoStatus = await getPressoPayPaymentStatus(targetRef);
          if (pressoStatus && ['COMPLETED', 'SUCCESS', 'PAID', 'APPROVED'].includes(String(pressoStatus.status || '').toUpperCase())) {
            await supabase
              .from('orders')
              .update({
                status: 'completed',
                payment_status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            order.status = 'completed';
            order.payment_status = 'completed';
            isCompleted = true;
          }
        }
      } catch (pErr) {
        console.warn('[Status API] Live check warning:', pErr);
      }
    }

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
