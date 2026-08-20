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
    const limitResult = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
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
    const visitor_phone = formatTzPhone(rawPhone);
    const localPhone = toLocalPhone(rawPhone);
    const customer_name = String(rawCustomerName || body.name || body.customerName || 'Mteja wa Mtandaoni').trim();
    const supabase = createAdminClient();

    let gameTitle = 'Digital Product Access';
    let gamePrice = 0;
    let downloadUrl = '';
    let durationType = 'Lifetime';
    let durationHours = 720;

    // 1. Fetch Product details from posts table (primary) or games table
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', game_id)
      .maybeSingle();

    if (postData) {
      gameTitle = postData.title || gameTitle;
      gamePrice = Number(postData.price) || 0;
      downloadUrl = postData.links?.[0]?.url || '';
      if (postData.duration_days) {
        durationHours = postData.duration_days * 24;
        durationType = `${postData.duration_days} Days`;
      }
    } else {
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', game_id)
        .maybeSingle();

      if (gameData) {
        gameTitle = gameData.title || gameTitle;
        gamePrice = Number(gameData.price) || 0;
        downloadUrl = gameData.download_url || '';
        if (gameData.access_duration) durationType = gameData.access_duration;
      }
    }

    const downloadToken = crypto.randomBytes(16).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const activationKey = generateActivationKey('CP-CG');
    const orderNumber = 'CPCG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialStatus = gamePrice === 0 ? 'completed' : 'pending';

    console.log(`[Checkout] 📝 Step 1: Creating Order Record FIRST: ${orderNumber} | Phone: ${visitor_phone} | Product: ${gameTitle} (TZS ${gamePrice})`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. FIND OR CREATE VISITOR (Satisfies visitors foreign key constraint)
    // ──────────────────────────────────────────────────────────────────────────
    let visitorId: number | null = null;
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
      console.warn('[Checkout] Visitor record warning:', vErr);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INSERT INTO PRIMARY TABLE: payment_orders (Guarantees Admin View)
    // ──────────────────────────────────────────────────────────────────────────
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
        console.warn('[Checkout] payment_orders insert error:', poErr.message);
      } else {
        createdPaymentOrder = poData;
      }
    } catch (poErr) {
      console.error('[Checkout] payment_orders insert exception:', poErr);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. INSERT INTO xx_orders & xx_users (Full Multi-Table Ingestion)
    // ──────────────────────────────────────────────────────────────────────────
    try {
      await supabase.from('xx_users').upsert(
        {
          name: customer_name,
          phone: visitor_phone,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );
    } catch {}

    try {
      await supabase.from('xx_orders').insert({
        phone: visitor_phone,
        amount: gamePrice,
        status: initialStatus === 'completed' ? 'completed' : 'pending',
        reference_id: orderNumber,
        hours_granted: durationHours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {}

    // Fallback attempt for orders table (if created in future)
    try {
      await supabase.from('orders').insert({
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
      });
    } catch {}

    // ──────────────────────────────────────────────────────────────────────────
    // 5. BROADCAST NEW ORDER IN REAL TIME TO ADMIN PANEL & STOREFRONT
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

    // 6. Trigger Telegram Notification
    sendTelegramOrderNotification({
      order_number: orderNumber,
      visitor_phone,
      game_title: gameTitle,
      amount: gamePrice,
      payment_gateway: gamePrice === 0 ? 'FREE' : DEFAULT_PAYMENT_GATEWAY,
      activation_key: activationKey,
    }).catch((err) => console.warn('Telegram Notification Error:', err));

    // ──────────────────────────────────────────────────────────────────────────
    // 7. STEP 2: DISPATCH STK PUSH TO PRESSOPAY
    // ──────────────────────────────────────────────────────────────────────────
    let resolvedGateway: 'pressopay' | 'harakapay' | 'free' = 'pressopay';
    let gatewayReference: string | undefined;
    let gatewayRaw: any = null;

    if (gamePrice > 0) {
      try {
        console.log(`[Checkout] 🚀 Step 2: Dispatching STK Push via PressoPay for order ${orderNumber}...`);
        const gatewayResult = await routePayment({
          amount: gamePrice,
          phone: visitor_phone,
          orderNumber,
        });

        resolvedGateway = gatewayResult.gateway;
        gatewayReference = gatewayResult.gatewayReference;
        gatewayRaw = gatewayResult.rawResponse;

        // If gateway returned a reference, update promo_used if different
        if (createdPaymentOrder?.id && gatewayReference) {
          await supabase
            .from('payment_orders')
            .update({
              promo_used: `${orderNumber}|${gatewayReference}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', createdPaymentOrder.id);
        }
      } catch (gwErr: any) {
        console.error('[Checkout] ❌ Gateway execution warning (Order preserved in DB):', gwErr);
      }
    } else {
      resolvedGateway = 'free';
    }

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

    return NextResponse.json({
      success: true,
      order: orderOutput,
      orderNumber,
      orderId: createdPaymentOrder?.id || orderNumber,
      gatewayResponse: gatewayRaw,
      usedGateway: resolvedGateway,
    });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Hitilafu imetokea wakati wa kuanzisha oda.' },
      { status: 500 }
    );
  }
}
