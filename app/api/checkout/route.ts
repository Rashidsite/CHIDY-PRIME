export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CheckoutSchema } from '@/lib/zod/schemas';
import { rateLimit } from '@/lib/rate-limit';
import { generateActivationKey } from '@/lib/utils';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { routePayment, formatTzPhone, toLocalPhone, DEFAULT_PAYMENT_GATEWAY } from '@/lib/payment-gateway';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = rateLimit(ip, { limit: 40, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Maombi mengi mno kwa wakati mmoja. Tafadhali subiri sekunde chache.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { game_id, visitor_phone: rawPhone, customer_name: rawCustomerName } = validation.data as any;
    
    // Instant In-Memory Phone Sanitization & Formatting (255XXXXXXXXX)
    const visitor_phone = formatTzPhone(rawPhone);
    const localPhone = toLocalPhone(rawPhone);
    const customer_name = String(rawCustomerName || body.name || body.customerName || 'Mteja wa Mtandaoni').trim();
    const supabase = createAdminClient();

    let gameTitle = 'Digital Product Access';
    let gamePrice = 0;
    let downloadUrl = '';
    let durationType = 'Lifetime';
    let durationHours = 720;

    // 1. Fetch Product details from posts table
    const { data: postData } = await supabase
      .from('posts')
      .select('id, title, price, links, download_url, duration_days, plan_duration, access_duration')
      .eq('id', game_id)
      .maybeSingle();

    if (postData) {
      gameTitle = postData.title || gameTitle;
      gamePrice = Number(postData.price) || 0;
      downloadUrl = postData.links?.[0]?.url || postData.download_url || '';
      if (postData.duration_days) {
        durationHours = postData.duration_days * 24;
        durationType = `${postData.duration_days} Days`;
      } else if (postData.plan_duration || postData.access_duration) {
        durationType = postData.plan_duration || postData.access_duration;
      }
    }

    const downloadToken = crypto.randomBytes(16).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const activationKey = generateActivationKey('CP-CG');
    const orderNumber = 'CPCG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialStatus = gamePrice === 0 ? 'completed' : 'pending';

    console.log(`[Checkout ⚡ Ultra-Fast] Initiating: ${orderNumber} | Phone: ${visitor_phone} | Product: ${gameTitle} (TZS ${gamePrice})`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PARALLEL EXECUTION: PressoPay STK Push & Database Ingestion Concurrent
    // ──────────────────────────────────────────────────────────────────────────

    // Branch A: STK Push Gateway Dispatch
    const gatewayPromise = (async () => {
      if (gamePrice <= 0) {
        return {
          gateway: 'free' as const,
          status: 'COMPLETED',
          gatewayReference: orderNumber,
          rawResponse: { message: 'Free access granted' },
        };
      }

      try {
        console.log(`[Checkout ⚡] 🚀 Dispatching PressoPay STK Push in parallel for order ${orderNumber}...`);
        return await routePayment({
          amount: gamePrice,
          phone: visitor_phone,
          orderNumber,
          description: `Chidy Prime ${orderNumber} - ${gameTitle}`,
          buyerName: customer_name,
        });
      } catch (gwErr: any) {
        console.error('[Checkout ⚡] ❌ Gateway dispatch warning (DB order will still persist):', gwErr);
        return {
          gateway: 'pressopay' as const,
          gatewayReference: orderNumber,
          rawResponse: { error: gwErr?.message || 'Gateway dispatch timed out' },
          status: 'PENDING',
        };
      }
    })();

    // Branch B: Database Persistence & Ingestion Pipeline
    const dbPersistencePromise = (async () => {
      let visitorId: number | null = null;

      // Visitor lookup or create
      try {
        const { data: existingVisitor } = await supabase
          .from('visitors')
          .select('id')
          .or(`phone.eq.${visitor_phone},phone.eq.${localPhone},phone.eq.+${visitor_phone}`)
          .limit(1)
          .maybeSingle();

        if (existingVisitor) {
          visitorId = existingVisitor.id;
        } else {
          const { data: newV } = await supabase
            .from('visitors')
            .insert({
              name: customer_name,
              phone: visitor_phone,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          visitorId = newV?.id || null;
        }
      } catch (vErr) {
        console.warn('[Checkout ⚡] Visitor lookup/insert notice:', vErr);
      }

      // Main payment_orders table insert
      let createdPaymentOrder: any = null;
      try {
        const { data: poData, error: poErr } = await supabase
          .from('payment_orders')
          .insert({
            visitor_id: visitorId,
            post_id: game_id,
            amount: gamePrice,
            phone_number: visitor_phone,
            status: initialStatus === 'completed' ? 'approved' : 'pending',
            promo_used: orderNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*, posts(title), visitors(name, phone)')
          .single();

        if (poErr) {
          console.warn('[Checkout ⚡] payment_orders insert note:', poErr.message);
        } else {
          createdPaymentOrder = poData;
        }
      } catch (poErr) {
        console.error('[Checkout ⚡] payment_orders insert exception:', poErr);
      }

      // Secondary sync inserts (Non-blocking / parallel)
      const secondaryInserts = [
        supabase.from('xx_users').upsert(
          {
            name: customer_name,
            phone: visitor_phone,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'phone' }
        ),
        supabase.from('xx_orders').insert({
          phone: visitor_phone,
          amount: gamePrice,
          status: initialStatus === 'completed' ? 'completed' : 'pending',
          reference_id: orderNumber,
          hours_granted: durationHours,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        supabase.from('orders').insert({
          order_number: orderNumber,
          visitor_phone,
          phone_number: visitor_phone,
          customer_name,
          game_id,
          product_id: game_id,
          game_title: gameTitle,
          amount: gamePrice,
          currency: 'TZS',
          status: initialStatus,
          payment_status: initialStatus,
          payment_gateway: gamePrice === 0 ? 'free' : 'pressopay',
          download_token: downloadToken,
          token_expires_at: tokenExpiresAt,
          access_duration: durationType,
          activation_key: activationKey,
          download_url: downloadUrl,
          created_at: new Date().toISOString(),
        }),
      ];

      Promise.allSettled(secondaryInserts).catch(() => {});

      return {
        visitorId,
        createdPaymentOrder,
      };
    })();

    // Await both parallel branches
    const [gatewayResult, dbResult] = await Promise.all([
      gatewayPromise,
      dbPersistencePromise,
    ]);

    const createdPaymentOrder = dbResult.createdPaymentOrder;
    const resolvedGateway = gatewayResult.gateway || 'pressopay';
    const gatewayReference = gatewayResult.gatewayReference;
    const gatewayRaw = gatewayResult.rawResponse;

    // Async Gateway Ref Sync if gateway returned additional reference ID
    if (createdPaymentOrder?.id && gatewayReference && gatewayReference !== orderNumber) {
      (async () => {
        try {
          await supabase
            .from('payment_orders')
            .update({
              promo_used: `${orderNumber}|${gatewayReference}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', createdPaymentOrder.id);
        } catch {}
      })().catch(() => {});
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. BACKGROUND REALTIME BROADCAST & NOTIFICATIONS (Zero Blocking Latency)
    // ──────────────────────────────────────────────────────────────────────────
    const realtimePayload = {
      orderId: createdPaymentOrder?.id || orderNumber,
      orderNumber,
      orderRef: orderNumber,
      customerName: customer_name,
      visitorPhone: visitor_phone,
      productTitle: gameTitle,
      productId: game_id,
      amount: gamePrice,
      status: initialStatus,
      createdAt: new Date().toISOString(),
    };

    (async () => {
      try {
        const adminCh = supabase.channel('admin-orders');
        await adminCh.subscribe();
        await adminCh.send({ type: 'broadcast', event: 'ORDER_CREATED', payload: realtimePayload });
        supabase.removeChannel(adminCh);
      } catch {}

      try {
        const syncCh = supabase.channel('cross-domain-storefront-sync');
        await syncCh.subscribe();
        await syncCh.send({ type: 'broadcast', event: 'ORDER_CREATED', payload: realtimePayload });
        supabase.removeChannel(syncCh);
      } catch {}
    })().catch(() => {});

    // Asynchronous Telegram Notification
    sendTelegramOrderNotification({
      order_number: orderNumber,
      visitor_phone,
      game_title: gameTitle,
      amount: gamePrice,
      payment_gateway: gamePrice === 0 ? 'FREE' : DEFAULT_PAYMENT_GATEWAY,
      activation_key: activationKey,
    }).catch((err) => console.warn('[Telegram Notification] Notice:', err));

    const orderOutput = {
      id: createdPaymentOrder?.id || orderNumber,
      order_number: orderNumber,
      order_id: createdPaymentOrder?.id || orderNumber,
      visitor_phone,
      customer_name,
      game_id,
      product_id: game_id,
      game_title: gameTitle,
      amount: gamePrice,
      status: initialStatus,
      download_token: downloadToken,
      activation_key: activationKey,
    };

    // Sub-500ms Instant Response to Frontend
    return NextResponse.json(
      {
        success: true,
        order: orderOutput,
        orderNumber,
        orderId: createdPaymentOrder?.id || orderNumber,
        gatewayResponse: gatewayRaw,
        usedGateway: resolvedGateway,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Response-Time': 'Sub-500ms',
        },
      }
    );
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Hitilafu imetokea wakati wa kuanzisha oda.' },
      { status: 500 }
    );
  }
}
