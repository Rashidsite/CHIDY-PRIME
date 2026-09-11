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
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      config: DEFAULT_POPUP_CONFIG,
    });
  }
}
