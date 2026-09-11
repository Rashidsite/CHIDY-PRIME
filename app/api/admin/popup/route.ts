import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const DEFAULT_POPUP_CONFIG = {
  enabled: false,
  title: 'TANGAZO LA GAME',
  message: 'Cheza game mpya kwa kubonyeza hapa chini!',
  btn_text: 'FUNGUA HAPA',
  btn_link: 'https://chidyprimetz.com/games',
  icon: '🎮',
  badge: 'HOT GAME',
  delay_seconds: 3,
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'game_toast_popup')
      .maybeSingle();

    let config = DEFAULT_POPUP_CONFIG;
    if (data && data.value) {
      config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      config: DEFAULT_POPUP_CONFIG,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const config = {
      enabled: Boolean(body.enabled),
      title: (body.title || 'TANGAZO LA GAME').trim(),
      message: (body.message || '').trim(),
      btn_text: (body.btn_text || 'FUNGUA HAPA').trim(),
      btn_link: (body.btn_link || '').trim(),
      icon: (body.icon || '🎮').trim(),
      badge: (body.badge || '').trim(),
      delay_seconds: Math.max(0, parseInt(body.delay_seconds, 10) || 0),
    };

    // 1. Save to site_settings
    await supabase
      .from('site_settings')
      .upsert({ key: 'game_toast_popup', value: config }, { onConflict: 'key' });

    // 2. Save to store_settings
    try {
      await supabase
        .from('store_settings')
        .upsert({ key: 'game_toast_popup', value: config }, { onConflict: 'key' });
    } catch {}

    // 3. Broadcast update
    try {
      const channel = supabase.channel('storefront-sync');
      await channel.send({
        type: 'broadcast',
        event: 'GAME_POPUP_UPDATED',
        payload: config,
      });
    } catch (e) {
      console.warn('Realtime broadcast failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Mipangilio ya Popup imehifadhiwa kikamilifu!',
      config,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
