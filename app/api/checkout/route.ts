import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CheckoutSchema } from '@/lib/zod/schemas';
import { rateLimit } from '@/lib/rate-limit';
import { generateActivationKey } from '@/lib/utils';
import { sendTelegramOrderNotification } from '@/lib/telegram';
import { routePayment, cleanPhoneNumber, formatTzPhone } from '@/lib/payment-gateway';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      return NextResponse.json({ success: false, error: 'Maombi mengi mno kwa wakati mmoja. Tafadhali subiri sekunde chache.' }, { status: 429 });
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
    const customer_name = String(rawCustomerName || body.name || body.customerName || 'Mteja wa Mtandaoni').trim();
    const supabase = createAdminClient();

    let gameTitle = 'Digital Product Access';
    let gamePrice = 0;
    let downloadUrl = '';
    let durationType = 'Lifetime';

    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .maybeSingle();

    if (gameData) {
      gameTitle = gameData.title;
      gamePrice = Number(gameData.price) || 0;
      downloadUrl = gameData.download_url || '';
      if (gameData.access_duration) durationType = gameData.access_duration;
    } else {
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', game_id)
        .maybeSingle();

      if (postData) {
        gameTitle = postData.title;
        gamePrice = Number(postData.price) || 0;
        downloadUrl = postData.links?.[0]?.url || '';
        if (postData.access_duration) durationType = postData.access_duration;
      }
    }

    const downloadToken = crypto.randomBytes(16).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const activationKey = generateActivationKey('CP-CG');
    const orderNumber = 'CPCG-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const initialStatus = gamePrice === 0 ? 'completed' : 'pending';

    // ──────────────────────────────────────────────────────────────────────────
    // 1. IMMEDIATE ORDER INGESTION (Record BEFORE gateway execution)
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`[Checkout] 📝 Immediate Ingestion for order: ${orderNumber} | Phone: ${visitor_phone} | Product: ${gameTitle} (TZS ${gamePrice})`);

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      console.warn('[Checkout] ⚠️ Primary order insert warning:', insertError.message);
    }

    // 2. Auto-register / Upsert Customer Profile into database
    try {
      await supabase.from('profiles').upsert(
        {
          phone_number: visitor_phone,
          full_name: customer_name,
          role: 'user',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone_number' }
      );
    } catch {}

    try {
      await supabase.from('xx_users').upsert(
        {
          phone: visitor_phone,
          name: customer_name,
          role: 'user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );
    } catch {}

    // 3. Insert into immutable payment_transactions ledger
    try {
      await supabase.from('payment_transactions').insert({
        order_ref: orderNumber,
        phone_number: visitor_phone,
        product_id: game_id,
        amount: gamePrice,
        currency: 'TZS',
        gateway: gamePrice === 0 ? 'free' : 'pressopay',
        status: gamePrice === 0 ? 'COMPLETED' : 'PENDING',
        raw_request: {
          customer_name,
          visitor_phone,
          game_id,
          game_title: gameTitle,
          amount: gamePrice,
        },
      });
    } catch {}

    // 4. Fallback record into payment_orders for legacy views
    try {
      await supabase.from('payment_orders').insert({
        visitor_id: Math.floor(Math.random() * 10000),
        post_id: game_id,
        amount: gamePrice,
        phone_number: visitor_phone,
        status: initialStatus === 'completed' ? 'approved' : 'pending',
        promo_used: orderNumber,
      });
    } catch {}

    // 5. Trigger Instant Telegram Admin Alert
    sendTelegramOrderNotification({
      order_number: orderNumber,
      visitor_phone,
      game_title: gameTitle,
      amount: gamePrice,
      payment_gateway: gamePrice === 0 ? 'FREE' : 'PressoPay / HarakaPay',
      activation_key: activationKey,
    }).catch((err) => console.warn('Telegram Notification Error:', err));

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SMART GATEWAY ROUTING (Trigger STK Push)
    // ──────────────────────────────────────────────────────────────────────────
    let resolvedGateway: 'pressopay' | 'harakapay' | 'free' = 'pressopay';
    let gatewayReference: string | undefined;
    let gatewayRaw: any = null;

    if (gamePrice > 0) {
      try {
        const gatewayResult = await routePayment({
          amount: gamePrice,
          phone: visitor_phone,
          orderNumber,
        });

        resolvedGateway = gatewayResult.gateway;
        gatewayReference = gatewayResult.gatewayReference;
        gatewayRaw = gatewayResult.rawResponse;

        await supabase
          .from('orders')
          .update({
            payment_gateway: resolvedGateway,
            gateway_reference: gatewayReference || null,
            updated_at: new Date().toISOString(),
          })
          .eq('order_number', orderNumber);

        await supabase
          .from('payment_transactions')
          .update({
            gateway: resolvedGateway,
            gateway_ref: gatewayReference || null,
            raw_response: gatewayRaw,
            updated_at: new Date().toISOString(),
          })
          .eq('order_ref', orderNumber);
      } catch (gwErr: any) {
        console.error('[Checkout] ❌ Gateway execution error (Order preserved in DB):', gwErr);
      }
    } else {
      resolvedGateway = 'free';
    }

    return NextResponse.json({
      success: true,
      order: order || {
        order_number: orderNumber,
        visitor_phone,
        game_id,
        game_title: gameTitle,
        amount: gamePrice,
        status: initialStatus,
        download_token: downloadToken,
      },
      orderNumber,
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
