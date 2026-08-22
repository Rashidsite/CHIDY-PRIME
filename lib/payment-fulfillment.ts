import { createAdminClient } from '@/lib/supabase/admin';
import { parseUniversalDownloadLinks } from '@/lib/link-parser';
import { notifySuccessfulPayment } from '@/lib/telegram';
import { formatTzPhone, toLocalPhone } from '@/lib/payment-gateway';

// Normalize any phone number format to 255XXXXXXXXX
export function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  return formatTzPhone(raw);
}

// Convert access duration to ISO date
export function calculateExpirationDate(duration?: string | number): string {
  const now = new Date();
  if (!duration) {
    now.setFullYear(now.getFullYear() + 10);
    return now.toISOString(); // Default Lifetime = 10 years
  }

  if (typeof duration === 'number') {
    if (duration === 0) {
      now.setFullYear(now.getFullYear() + 10);
      return now.toISOString();
    }
    now.setDate(now.getDate() + duration);
    return now.toISOString();
  }

  const clean = String(duration).trim().toLowerCase();
  if (clean.includes('lifetime') || clean.includes('maisha') || clean === '0' || clean === 'infinity') {
    now.setFullYear(now.getFullYear() + 10);
    return now.toISOString();
  }
  if (clean.includes('30 day') || clean.includes('mwezi 1') || clean.includes('30')) {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }
  if (clean.includes('7 day') || clean.includes('wiki 1') || clean.includes('7')) {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }
  if (clean.includes('24 hour') || clean.includes('siku 1') || clean.includes('24')) {
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  }
  if (clean.includes('2 hour') || clean.includes('masaa 2') || clean.includes('2h') || clean === '2') {
    now.setHours(now.getHours() + 2);
    return now.toISOString();
  }

  now.setFullYear(now.getFullYear() + 10);
  return now.toISOString();
}

/**
 * Universal Parser for incoming Webhook payloads (supports JSON, FormData, and QueryParams)
 */
export async function parseIncomingWebhookPayload(request: Request): Promise<any> {
  const url = new URL(request.url);
  const queryParams: Record<string, any> = {};
  url.searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  let bodyData: any = {};
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      bodyData = await request.json().catch(() => ({}));
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        formData.forEach((val, key) => {
          bodyData[key] = typeof val === 'string' ? val : val.name;
        });
      }
    } else {
      const text = await request.text().catch(() => '');
      if (text) {
        try {
          bodyData = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          params.forEach((val, key) => {
            bodyData[key] = val;
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Webhook Parser] Request body parse warning:', err);
  }

  // Merge body and query params (body takes precedence)
  return { ...queryParams, ...bodyData };
}

export interface FulfillOrderParams {
  orderIdOrRef?: string | null;
  phone?: string | null;
  gatewayRef?: string | null;
  gatewayName?: string | null;
  accessDuration?: string | null;
  paidAmount?: number | null;
}

export interface FulfillOrderResult {
  success: boolean;
  order?: any;
  orderId?: string;
  orderNumber?: string;
  phone?: string;
  productId?: string;
  productTitle?: string;
  downloadLinks?: any[];
  isAlreadyApproved?: boolean;
  error?: string;
}

/**
 * ATOMIC MASTER FULFILLMENT & ORDER APPROVAL PIPELINE
 * Updates all tables (payment_orders, orders, xx_orders, xx_users, user_purchases)
 * and dispatches Realtime broadcasts to instantly unlock customer modals and admin views.
 */
export async function fulfillOrderApproval(params: FulfillOrderParams): Promise<FulfillOrderResult> {
  const supabase = createAdminClient();
  const rawRef = (params.orderIdOrRef || '').trim();
  const rawGatewayRef = (params.gatewayRef || '').trim();
  const rawPhone = (params.phone || '').trim();
  const cleanPhone = normalizePhone(rawPhone);
  const localPhone = toLocalPhone(cleanPhone || rawPhone);

  console.log(`[Fulfill Pipeline] ⚡ Processing approval for ref: "${rawRef}", gatewayRef: "${rawGatewayRef}", phone: "${cleanPhone}"`);

  let targetPaymentOrder: any = null;

  // ── 1. STRATEGY A: Find by UUID id in payment_orders ──
  if (rawRef && rawRef.includes('-') && rawRef.length === 36) {
    const { data } = await supabase
      .from('payment_orders')
      .select('*, posts(*), visitors(*)')
      .eq('id', rawRef)
      .maybeSingle();
    if (data) targetPaymentOrder = data;
  }

  // ── 2. STRATEGY B: Find by promo_used matching order reference (CPCG-XXXXX) ──
  if (!targetPaymentOrder && rawRef) {
    const { data } = await supabase
      .from('payment_orders')
      .select('*, posts(*), visitors(*)')
      .ilike('promo_used', `%${rawRef}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) targetPaymentOrder = data;
  }

  // ── 3. STRATEGY C: Find by gateway reference in promo_used ──
  if (!targetPaymentOrder && rawGatewayRef) {
    const { data } = await supabase
      .from('payment_orders')
      .select('*, posts(*), visitors(*)')
      .ilike('promo_used', `%${rawGatewayRef}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) targetPaymentOrder = data;
  }

  // ── 4. STRATEGY D: Match from xx_orders reference_id ──
  if (!targetPaymentOrder && rawRef) {
    try {
      const { data: xxOrder } = await supabase
        .from('xx_orders')
        .select('*')
        .or(`reference_id.eq.${rawRef},id.eq.${rawRef}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (xxOrder && xxOrder.phone) {
        const xxPhone = normalizePhone(xxOrder.phone);
        const { data: poByPhone } = await supabase
          .from('payment_orders')
          .select('*, posts(*), visitors(*)')
          .or(`phone_number.eq.${xxPhone},phone_number.eq.${toLocalPhone(xxPhone)}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (poByPhone) targetPaymentOrder = poByPhone;
      }
    } catch {}
  }

  // ── 5. STRATEGY E: Match by Phone (Latest pending/processing order) ──
  if (!targetPaymentOrder && (cleanPhone || localPhone)) {
    const { data: byPhone } = await supabase
      .from('payment_orders')
      .select('*, posts(*), visitors(*)')
      .or(`phone_number.eq.${cleanPhone},phone_number.eq.${localPhone},phone_number.eq.+${cleanPhone}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byPhone) targetPaymentOrder = byPhone;
  }

  // ── 6. FALLBACK: Check if order exists in fallback 'orders' table ──
  let fallbackOrderRecord: any = null;
  if (!targetPaymentOrder && rawRef) {
    try {
      const { data: ordData } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.eq.${rawRef},id.eq.${rawRef.includes('-') && rawRef.length === 36 ? rawRef : '00000000-0000-0000-0000-000000000000'}`)
        .maybeSingle();
      if (ordData) fallbackOrderRecord = ordData;
    } catch {}
  }

  if (!targetPaymentOrder && !fallbackOrderRecord) {
    console.warn(`[Fulfill Pipeline] ⚠️ Order not found for ref: "${rawRef}", gatewayRef: "${rawGatewayRef}", phone: "${cleanPhone}"`);
    return {
      success: false,
      error: `Order with reference "${rawRef || rawGatewayRef || cleanPhone}" was not found.`,
    };
  }

  // Collect resolved identifiers
  const targetId = String(targetPaymentOrder?.id || fallbackOrderRecord?.id || rawRef);
  const rawOrderNumber =
    targetPaymentOrder?.promo_used?.split('|')[0] ||
    fallbackOrderRecord?.order_number ||
    (rawRef.startsWith('CPCG-') ? rawRef : `CPCG-${targetId.substring(0, 6).toUpperCase()}`);

  const effectivePhone = normalizePhone(
    targetPaymentOrder?.phone_number ||
    targetPaymentOrder?.visitors?.phone ||
    fallbackOrderRecord?.visitor_phone ||
    fallbackOrderRecord?.phone_number ||
    cleanPhone
  );
  const effectiveLocalPhone = toLocalPhone(effectivePhone);
  const customerName =
    targetPaymentOrder?.visitors?.name ||
    fallbackOrderRecord?.customer_name ||
    'Mteja wa Mtandaoni';

  const productId =
    targetPaymentOrder?.post_id ||
    fallbackOrderRecord?.game_id ||
    fallbackOrderRecord?.product_id ||
    '';

  const postDetails = targetPaymentOrder?.posts || fallbackOrderRecord || {};
  const productTitle = postDetails.title || fallbackOrderRecord?.game_title || 'Digital Product';
  const downloadLinks = parseUniversalDownloadLinks(postDetails);
  const durationType =
    params.accessDuration ||
    postDetails.plan_duration ||
    postDetails.access_duration ||
    postDetails.duration ||
    'Lifetime';
  const expiresAt = calculateExpirationDate(durationType);

  const updatedPromoUsed = targetPaymentOrder?.promo_used?.includes('|')
    ? targetPaymentOrder.promo_used
    : `${rawOrderNumber}|${rawGatewayRef || 'PP:auto-approved'}`;

  const currentStatus = String(targetPaymentOrder?.status || fallbackOrderRecord?.status || '').toLowerCase();
  const isAlreadyApproved = ['approved', 'completed', 'paid'].includes(currentStatus);

  console.log(`[Fulfill Pipeline] 🚀 Executing Database Updates for Order: ${targetId} (${rawOrderNumber}) | Phone: ${effectivePhone}`);

  // ── STEP A: Update payment_orders ──
  if (targetPaymentOrder?.id) {
    try {
      await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          promo_used: updatedPromoUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetPaymentOrder.id);
    } catch (err: any) {
      console.error('[Fulfill Pipeline] payment_orders update error:', err.message);
    }
  }

  // ── STEP B: Update fallback 'orders' table ──
  try {
    await supabase
      .from('orders')
      .update({
        status: 'approved',
        payment_status: 'completed',
        unlocked: true,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${targetId},order_number.eq.${rawOrderNumber}`);
  } catch {}

  // ── STEP C: Update xx_orders ──
  try {
    await supabase
      .from('xx_orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .or(`reference_id.eq.${rawOrderNumber},reference_id.eq.${targetId}`);
  } catch {}

  // ── STEP D: Update xx_users access ──
  if (effectivePhone) {
    try {
      const { data: existingUser } = await supabase
        .from('xx_users')
        .select('id, phone')
        .or(`phone.eq.${effectivePhone},phone.eq.${effectiveLocalPhone},phone.eq.+${effectivePhone}`)
        .limit(1)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('xx_users')
          .update({ access_until: expiresAt })
          .eq('id', existingUser.id);
      } else {
        await supabase.from('xx_users').insert({
          name: customerName,
          phone: effectivePhone,
          access_until: expiresAt,
          created_at: new Date().toISOString(),
        });
      }
    } catch (uErr) {
      console.warn('[Fulfill Pipeline] xx_users update warning:', uErr);
    }
  }

  // ── STEP F: Realtime Multi-Channel Broadcast Dispatch ──
  const broadcastPayload = {
    orderId: targetId,
    orderNumber: rawOrderNumber,
    orderRef: rawOrderNumber,
    productId,
    productTitle,
    phone: effectivePhone,
    customerName,
    status: 'UNLOCKED',
    isApproved: true,
    accessDuration: durationType,
    accessExpiresAt: expiresAt,
    downloadLinks,
    unlockedAt: new Date().toISOString(),
  };

  const channelNames = [
    'admin-orders',
    'cross-domain-storefront-sync',
    'storefront-sync',
    'order-updates-storefront',
  ];

  for (const chName of channelNames) {
    try {
      const ch = supabase.channel(chName);
      await ch.subscribe();
      await ch.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
      await ch.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
      await ch.send({ type: 'broadcast', event: 'ORDER_UPDATED', payload: broadcastPayload });
      supabase.removeChannel(ch);
    } catch {}
  }

  // Per-order modal broadcast
  try {
    const modalCh = supabase.channel(`order_broadcast_modal_${targetId}`);
    await modalCh.subscribe();
    await modalCh.send({ type: 'broadcast', event: 'ORDER_APPROVED', payload: broadcastPayload });
    await modalCh.send({ type: 'broadcast', event: 'PRODUCT_UNLOCKED', payload: broadcastPayload });
    supabase.removeChannel(modalCh);
  } catch {}

  // Trigger Telegram Sales Alert if not already approved
  if (!isAlreadyApproved) {
    notifySuccessfulPayment({
      id: targetId,
      order_number: rawOrderNumber,
      amount: targetPaymentOrder?.amount || fallbackOrderRecord?.amount || params.paidAmount || 0,
      game_title: productTitle,
      visitor_phone: effectivePhone,
      payment_gateway: (params.gatewayName || 'PRESSOPAY').toUpperCase(),
    }).catch(() => {});
  }

  console.log(`[Fulfill Pipeline] 🎉 Order ${targetId} (${rawOrderNumber}) APPROVED & UNLOCKED for ${effectivePhone}.`);

  return {
    success: true,
    isAlreadyApproved,
    orderId: targetId,
    orderNumber: rawOrderNumber,
    phone: effectivePhone,
    productId,
    productTitle,
    downloadLinks,
    order: {
      id: targetId,
      order_number: rawOrderNumber,
      order_id: targetId,
      game_id: productId,
      product_id: productId,
      game_title: productTitle,
      amount: targetPaymentOrder?.amount || fallbackOrderRecord?.amount || 0,
      status: 'approved',
      customer_name: customerName,
      visitor_phone: effectivePhone,
      download_links: downloadLinks,
      access_duration: durationType,
      access_expires_at: expiresAt,
    },
  };
}
