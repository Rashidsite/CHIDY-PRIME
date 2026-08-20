export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTzPhone, toLocalPhone, getPressoPayPaymentStatus, getHarakaPayStatus } from '@/lib/payment-gateway';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId =
      searchParams.get('reference') ||
      searchParams.get('order_id') ||
      searchParams.get('ref') ||
      searchParams.get('orderNumber') ||
      searchParams.get('order_number');
    const rawPhone = searchParams.get('phone') || searchParams.get('phone_number');
    const intlPhone = formatTzPhone(rawPhone || '');
    const localPhone = toLocalPhone(rawPhone || '');

    const supabase = createAdminClient();
    const isUuid = orderId && orderId.includes('-') && orderId.length === 36;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. QUERY payment_orders (Primary Database Table)
    // ──────────────────────────────────────────────────────────────────────────
    let order: any = null;

    if (orderId) {
      const refPattern = `%${orderId}%`;
      const { data } = await supabase
        .from('payment_orders')
        .select('*, posts(*), visitors(*)')
        .or(`promo_used.ilike.${refPattern}${isUuid ? `,id.eq.${orderId}` : ''}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      order = data;
    }

    if (!order && (intlPhone || localPhone)) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*, posts(*), visitors(*)')
        .or(`phone_number.eq.${intlPhone},phone_number.eq.${localPhone}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      order = data;
    }

    let isCompleted = order && ['completed', 'approved', 'paid'].includes((order.status || '').toLowerCase());

    // ──────────────────────────────────────────────────────────────────────────
    // 2. LIVE GATEWAY STATUS CHECK (PressoPay API Fallback)
    // ──────────────────────────────────────────────────────────────────────────
    if (order && !isCompleted) {
      const targetRef = order.promo_used?.split('|')[0] || order.id || orderId;
      try {
        const pressoStatus = await getPressoPayPaymentStatus(targetRef);
        const pStatusStr = String(
          pressoStatus?.status || pressoStatus?.payment_status || pressoStatus?.data?.status || ''
        ).toUpperCase();

        if (['COMPLETED', 'SUCCESS', 'PAID', 'APPROVED', 'OK', 'COMPLETE'].includes(pStatusStr)) {
          isCompleted = true;
          order.status = 'approved';

          // Commit to database
          await supabase
            .from('payment_orders')
            .update({
              status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          try {
            await supabase
              .from('xx_orders')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('reference_id', targetRef);
          } catch {}

          const effectivePhone = formatTzPhone(order.phone_number || intlPhone || '');
          const postData = order.posts || {};
          const downloadLinks = parseUniversalDownloadLinks(postData);

          // Realtime broadcast
          const broadcastPayload = {
            orderId: String(order.id),
            orderNumber: targetRef,
            orderRef: targetRef,
            productId: order.post_id,
            phone: effectivePhone,
            customerName: order.visitors?.name || 'Mteja',
            productTitle: postData.title || 'Digital Product',
            status: 'UNLOCKED',
            isApproved: true,
            downloadLinks,
            unlockedAt: new Date().toISOString(),
          };

          try {
            const adminCh = supabase.channel('admin-orders');
            await adminCh.subscribe();
            await adminCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
            supabase.removeChannel(adminCh);
          } catch {}

          try {
            const syncCh = supabase.channel('cross-domain-storefront-sync');
            await syncCh.subscribe();
            await syncCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
            supabase.removeChannel(syncCh);
          } catch {}

          notifySuccessfulPayment({
            id: order.id,
            order_number: targetRef,
            amount: order.amount || 0,
            game_title: postData.title || 'Digital Product',
            visitor_phone: effectivePhone,
            payment_gateway: 'PRESSOPAY',
          }).catch(() => {});
        }
      } catch (pErr) {
        console.warn('[Status API] PressoPay live check warning:', pErr);
      }
    }

    let downloadLinks: any[] = [];
    if (order && order.posts) {
      downloadLinks = parseUniversalDownloadLinks(order.posts);
    }

    const orderRef = order?.promo_used?.split('|')[0] || order?.id || orderId;

    return NextResponse.json({
      success: true,
      is_completed: !!isCompleted,
      status: isCompleted ? 'completed' : order?.status || 'pending',
      order: order
        ? {
            id: order.id,
            order_number: orderRef,
            order_id: order.id,
            game_id: order.post_id,
            product_id: order.post_id,
            game_title: order.posts?.title || 'Digital Product',
            amount: order.amount,
            status: isCompleted ? 'completed' : order.status,
            customer_name: order.visitors?.name || 'Mteja',
            visitor_phone: order.phone_number,
            download_links: downloadLinks,
          }
        : null,
      download_links: downloadLinks,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
