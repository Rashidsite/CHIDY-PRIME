import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CheckoutSchema } from '@/lib/zod/schemas';
import { rateLimit } from '@/lib/rate-limit';
import { generateActivationKey } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = rateLimit(ip, { limit: 20, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      return NextResponse.json({ success: false, error: 'Too many checkout requests.' }, { status: 429 });
    }

    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { game_id, visitor_phone, payment_gateway } = validation.data;
    const supabase = createAdminClient();

    // Fetch game details from `games` or `posts`
    let gameTitle = 'Digital Game Access';
    let gamePrice = 0;
    let downloadUrl = '';

    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (gameData) {
      gameTitle = gameData.title;
      gamePrice = gameData.price;
      downloadUrl = gameData.download_url || '';
    } else {
      // Fallback query to existing legacy `posts` table
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', game_id)
        .single();

      if (postData) {
        gameTitle = postData.title;
        gamePrice = postData.price || 0;
        downloadUrl = postData.links?.[0]?.url || '';
      }
    }

    // Generate secure download token and activation key
    const downloadToken = crypto.randomBytes(16).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const activationKey = generateActivationKey('CHIDY');
    const orderNumber = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Free items auto-complete immediately
    const initialStatus = gamePrice === 0 ? 'completed' : 'pending';

    // Insert order record into `orders`
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        visitor_phone,
        game_id,
        game_title: gameTitle,
        amount: gamePrice,
        currency: 'TZS',
        status: initialStatus,
        payment_gateway,
        download_token: downloadToken,
        token_expires_at: tokenExpiresAt,
        activation_key: activationKey,
        download_url: downloadUrl,
      })
      .select()
      .single();

    if (insertError) {
      // Fallback to existing legacy `payment_orders` table if `orders` not populated yet
      const { data: legacyOrder } = await supabase
        .from('payment_orders')
        .insert({
          visitor_id: Math.floor(Math.random() * 10000),
          post_id: game_id,
          amount: gamePrice,
          phone_number: visitor_phone,
          status: initialStatus === 'completed' ? 'approved' : 'pending',
          promo_used: `PP:${orderNumber}`,
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        order: {
          id: legacyOrder?.id || orderNumber,
          order_number: orderNumber,
          download_token: downloadToken,
          status: initialStatus,
          game_title: gameTitle,
          amount: gamePrice,
        },
      });
    }

    // Trigger PressoPay / STK push if non-zero price
    let gatewayResponse = null;
    if (gamePrice > 0 && payment_gateway === 'pressopay') {
      try {
        const pressopayRes = await fetch(`${process.env.PRESSOPAY_BASE_URL || 'https://pressopay.com'}/api/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.PRESSOPAY_API_KEY || '',
          },
          body: JSON.stringify({
            amount: gamePrice,
            phone: visitor_phone,
            reference: orderNumber,
            callback_url: process.env.PRESSOPAY_WEBHOOK_URL,
          }),
        });
        gatewayResponse = await pressopayRes.json();
      } catch (err) {
        console.warn('PressoPay Gateway Call Warning:', err);
      }
    }

    return NextResponse.json({
      success: true,
      order,
      gatewayResponse,
    });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
