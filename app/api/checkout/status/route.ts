export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTzPhone, toLocalPhone, getPressoPayPaymentStatus, getHarakaPayStatus } from '@/lib/payment-gateway';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';

function calculateExpirationDate(duration?: string): string | null {
  if (!duration || duration.toLowerCase().includes('lifetime') || duration.toLowerCase().includes('maisha')) {
    return null;
  }
  const now = new Date();
  const lower = duration.toLowerCase();

  if (lower.includes('30 day') || lower.includes('mwezi') || lower.includes('30')) {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }
  if (lower.includes('7 day') || lower.includes('wiki') || lower.includes('7')) {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }
  if (lower.includes('24 hour') || lower.includes('siku 1') || lower.includes('24')) {
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  }
  if (lower.includes('2 hour') || lower.includes('masaa 2') || lower.includes('2h')) {
    now.setHours(now.getHours() + 2);
    return now.toISOString();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id') || searchParams.get('ref') || searchParams.get('reference') || searchParams.get('orderNumber');
    const rawPhone = searchParams.get('phone') || searchParams.get('phone_number');
    const intlPhone = formatTzPhone(rawPhone || '');
    const localPhone = toLocalPhone(rawPhone || '');

    const supabase = createAdminClient();

    let order: any = null;
    if (orderId) {
      const isUuid = orderId.includes('-') && orderId.length === 36;
      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${isUuid ? orderId : '00000000-0000-0000-0000-000000000000'},order_number.eq.${orderId},transaction_ref.eq.${orderId},gateway_reference.eq.${orderId}`)
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

    // ── ACTIVE LIVE STATUS VERIFICATION WITH PRESSOPAY ──
    if (order && !isCompleted && (order.gateway_reference || order.order_number || order.transaction_ref)) {
      const targetRef = order.gateway_reference || order.transaction_ref || order.order_number;
      try {
        // 1. Check PressoPay First (Primary Gateway)
        const pressoStatus = await getPressoPayPaymentStatus(targetRef);
        const pStatusStr = String(pressoStatus?.status || pressoStatus?.payment_status || pressoStatus?.data?.status || '').toUpperCase();
        
        if (['COMPLETED', 'SUCCESS', 'PAID', 'APPROVED', 'OK', 'COMPLETE'].includes(pStatusStr)) {
          isCompleted = true;
          order.status = 'completed';
          order.payment_status = 'completed';
          order.paid_at = new Date().toISOString();
        }

        // 2. Check HarakaPay Fallback (if applicable)
        if (!isCompleted && (targetRef.startsWith('HP') || order.payment_gateway === 'harakapay')) {
          const hStatus = await getHarakaPayStatus(targetRef);
          if (hStatus?.success && hStatus?.payment?.status === 'completed') {
            isCompleted = true;
            order.status = 'completed';
            order.payment_status = 'completed';
            order.paid_at = new Date().toISOString();
          }
        }

        // If verified successful live, commit to database & unlock immediately!
        if (isCompleted) {
          await supabase
            .from('orders')
            .update({
              status: 'completed',
              payment_status: 'completed',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          const effectivePhone = formatTzPhone(order.visitor_phone || order.phone_number || rawPhone || '');
          const productId = order.game_id || order.product_id;
          const durationType = order.access_duration || 'Lifetime';
          const expiresAt = calculateExpirationDate(durationType);

          let links: any[] = [];
          let productTitle = order.game_title || 'Premium Game';

          if (productId) {
            const { data: gData } = await supabase.from('games').select('*').eq('id', productId).maybeSingle();
            const { data: pData } = await supabase.from('posts').select('*').eq('id', productId).maybeSingle();
            const merged = { ...gData, ...pData, ...order };
            if (merged.title) productTitle = merged.title;
            links = parseUniversalDownloadLinks(merged);
          }

          // Fulfill user_purchases
          await supabase.from('user_purchases').upsert(
            {
              order_id: String(order.id),
              order_reference: order.order_number || String(order.id),
              user_id: order.user_id || null,
              customer_phone: effectivePhone,
              phone_number: effectivePhone,
              product_id: productId,
              game_id: productId,
              product_title: productTitle,
              download_links: links,
              download_token: order.download_token,
              access_duration: durationType,
              access_expires_at: expiresAt,
              status: 'active',
              unlocked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'customer_phone,product_id' }
          );

          // Realtime broadcast to unlock client modal & storefront
          try {
            const ch = supabase.channel('cross-domain-storefront-sync');
            await ch.subscribe();
            await ch.send({
              type: 'broadcast',
              event: 'PRODUCT_UNLOCKED',
              payload: {
                phone: effectivePhone,
                productId: productId,
                orderRef: order.order_number || String(order.id),
                productTitle: productTitle,
                status: 'UNLOCKED',
                downloadLinks: links,
                unlockedAt: new Date().toISOString(),
              },
            });
            supabase.removeChannel(ch);
          } catch {}

          notifySuccessfulPayment({
            id: order.id,
            order_number: order.order_number || String(order.id),
            amount: order.amount || 0,
            game_title: productTitle,
            visitor_phone: effectivePhone,
            payment_gateway: order.payment_gateway || 'PRESSOPAY',
          }).catch(() => {});
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
      order: order ? { ...order, download_links: links } : null,
      download_links: links,
      activation_key: order?.activation_key,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
