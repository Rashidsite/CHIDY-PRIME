export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTzPhone, toLocalPhone, getPressoPayPaymentStatus, getHarakaPayStatus } from '@/lib/payment-gateway';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { fulfillOrderApproval, normalizePhone } from '@/lib/payment-fulfillment';

const STATUS_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'X-Accel-Buffering': 'no',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRef = (
      searchParams.get('reference') ||
      searchParams.get('order_id') ||
      searchParams.get('ref') ||
      searchParams.get('orderNumber') ||
      searchParams.get('order_number') ||
      ''
    ).trim();

    const rawPhone = (searchParams.get('phone') || searchParams.get('phone_number') || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const localPhone = toLocalPhone(rawPhone);

    const supabase = createAdminClient();

    // STRICT GUARD: If reference is missing or invalid, never query database with wildcards
    if (!rawRef || rawRef === 'undefined' || rawRef === 'null' || rawRef.trim().length < 4) {
      return NextResponse.json(
        {
          success: true,
          is_completed: false,
          isCompleted: false,
          status: 'pending',
          message: 'Order reference required',
        },
        { headers: STATUS_HEADERS }
      );
    }

    const isUuid = rawRef.includes('-') && rawRef.length === 36;
    let order: any = null;

    // 1. Strict Exact Match on payment_orders
    const { data } = await supabase
      .from('payment_orders')
      .select('*, posts(*), visitors(*)')
      .or(isUuid ? `id.eq.${rawRef},promo_used.eq.${rawRef}` : `promo_used.eq.${rawRef},promo_used.ilike.${rawRef}|%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    order = data;

    if (!order) {
      const { data: ordData } = await supabase
        .from('orders')
        .select('*, posts:game_id(*)')
        .or(isUuid ? `id.eq.${rawRef},order_number.eq.${rawRef}` : `order_number.eq.${rawRef}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ordData) {
        order = {
          id: ordData.id,
          post_id: ordData.game_id || ordData.product_id,
          amount: ordData.amount,
          status: ordData.status,
          phone_number: ordData.visitor_phone || ordData.phone_number,
          promo_used: ordData.order_number,
          activation_key: ordData.activation_key,
          posts: ordData.posts,
          visitors: { name: ordData.customer_name, phone: ordData.visitor_phone },
        };
      }
    }

    // Check if THIS specific order is approved in DB
    const currentStatus = String(order?.status || '').toLowerCase();
    let isCompleted = ['completed', 'approved', 'paid', 'success'].includes(currentStatus);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. LIVE GATEWAY QUERY FALLBACK (Only if not already confirmed in DB)
    // ──────────────────────────────────────────────────────────────────────────
    if (!isCompleted && (rawRef || order)) {
      const gatewayRefPart = order?.promo_used?.includes('|') ? order.promo_used.split('|')[1] : null;
      const orderRefPart = order?.promo_used?.split('|')[0] || order?.id || rawRef;

      const refsToTest = [gatewayRefPart, orderRefPart, rawRef].filter(Boolean) as string[];

      for (const testRef of refsToTest) {
        try {
          const pressoStatus = await getPressoPayPaymentStatus(testRef);
          if (pressoStatus) {
            const pStatusStr = String(
              pressoStatus.status ||
              pressoStatus.payment_status ||
              pressoStatus.data?.status ||
              pressoStatus.transaction_status ||
              ''
            ).trim().toUpperCase();

            if (['COMPLETED', 'SUCCESS', 'PAID', 'APPROVED', 'OK', 'COMPLETE', '00', 'TRUE'].includes(pStatusStr)) {
              console.log(`[Status Poller ⚡] PressoPay confirmed payment for ${testRef}! Fulfilling...`);
              const fulfillResult = await fulfillOrderApproval({
                orderIdOrRef: orderRefPart,
                gatewayRef: testRef,
                phone: cleanPhone || order?.phone_number,
                gatewayName: 'PRESSOPAY',
                paidAmount: order?.amount,
              });

              if (fulfillResult.success && fulfillResult.order) {
                order = {
                  ...order,
                  ...fulfillResult.order,
                  posts: order?.posts || {},
                  status: 'approved',
                };
                isCompleted = true;
                break;
              }
            }
          }
        } catch (pErr) {
          console.warn('[Status Poller ⚡] PressoPay live check warning:', pErr);
        }
      }

      // HarakaPay status check (Instant Handset USSD status verification)
      if (!isCompleted) {
        const hpRefCandidates = refsToTest.concat([
          order?.promo_used?.includes('|') ? order.promo_used.split('|')[1] : null,
          order?.promo_used,
        ]).filter(r => r && (r.startsWith('HP') || r.includes('HP')));

        for (const hpRefRaw of hpRefCandidates) {
          if (!hpRefRaw) continue;
          const hpRef = hpRefRaw.replace(/^HP:/, '');
          try {
            const hpStatus = await getHarakaPayStatus(hpRef);
            if (hpStatus?.success && ['completed', 'success', 'approved', 'paid'].includes(String(hpStatus.status || '').toLowerCase())) {
              console.log(`[Status Poller ⚡] HarakaPay confirmed payment for ${hpRef}! Fulfilling...`);
              const fulfillResult = await fulfillOrderApproval({
                orderIdOrRef: orderRefPart,
                gatewayRef: hpRef,
                phone: cleanPhone || order?.phone_number,
                gatewayName: 'HARAKAPAY',
                paidAmount: order?.amount,
              });
              if (fulfillResult.success && fulfillResult.order) {
                isCompleted = true;
                order = { ...order, ...fulfillResult.order, status: 'approved' };
                break;
              }
            }
          } catch (hpErr) {
            console.warn('[Status Poller ⚡] HarakaPay status check warning:', hpErr);
          }
        }
      }
    }

    let postRecord = order?.posts;
    if (isCompleted && (!postRecord || (!postRecord.links && !postRecord.download_url)) && (order?.post_id || order?.game_id || order?.product_id)) {
      try {
        const targetPostId = order.post_id || order.game_id || order.product_id;
        const isUuid = typeof targetPostId === 'string' && targetPostId.includes('-') && targetPostId.length === 36;
        const { data: directPost } = await supabase
          .from('posts')
          .select('*')
          .or(isUuid ? `id.eq.${targetPostId}` : `title.ilike.%${targetPostId}%`)
          .limit(1)
          .maybeSingle();
        if (directPost) {
          postRecord = { ...postRecord, ...directPost };
        }
      } catch {}
    }

    const downloadLinks = isCompleted ? parseUniversalDownloadLinks(postRecord || (Array.isArray(order?.download_links) ? { links: order.download_links } : {})) : [];
    const resolvedOrderNumber = order?.promo_used?.split('|')[0] || order?.order_number || order?.id || rawRef;

    return NextResponse.json(
      {
        success: true,
        is_completed: isCompleted,
        isCompleted: isCompleted,
        status: isCompleted ? 'approved' : order?.status || 'pending',
        orderNumber: resolvedOrderNumber,
        order: order
          ? {
              id: order.id,
              order_number: resolvedOrderNumber,
              order_id: order.id,
              game_id: order.post_id || order.game_id,
              product_id: order.post_id || order.product_id,
              game_title: postRecord?.title || order.game_title || 'Digital Product',
              amount: order.amount,
              status: isCompleted ? 'approved' : order.status || 'pending',
              customer_name: order.visitors?.name || order.customer_name || 'Mteja wa Mtandaoni',
              visitor_phone: order.phone_number || order.visitor_phone,
              download_links: isCompleted ? downloadLinks : [],
              activation_key: isCompleted ? (order.activation_key || 'CP-CG-ACTIVE') : null,
              access_duration: postRecord?.access_duration || postRecord?.plan_duration || order.access_duration || 'Lifetime',
            }
          : null,
        download_links: isCompleted ? downloadLinks : [],
      },
      {
        headers: STATUS_HEADERS,
      }
    );
  } catch (err: any) {
    console.error('[Status API ⚡] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: STATUS_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
