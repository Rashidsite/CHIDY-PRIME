import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch assistant settings
    const { data: settingData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'assistant_config')
      .maybeSingle();

    const config = settingData?.value || {
      welcome_message: 'Oya gamer! Karibu sana HQ ya ChidyPrime x ChidyGaming 🎮 Naitwa Chidy, nipo hapa kuhakikisha unacheza bila chenga. Niambie kaka, umekwama wapi au unahitaji mchongo gani leo?',
      general_youtube_url: 'https://www.youtube.com/@ChidyGaming',
      max_unpaid_attempts: 5,
      lockout_minutes: 60,
      featured_tz_games: [],
      featured_intl_games: [],
      hidden_video_vault: [],
    };

    // Fetch published games catalog for selection dropdowns
    const { data: games } = await supabase
      .from('posts')
      .select('id, title, category, price, image_url, description, youtube_url')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(200);

    const mappedCatalog = (games || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      category: g.category || 'Game',
      price: g.price || 3000,
      cover_image: g.image_url || '/placeholder.png',
      description: g.description || '',
      video_url: g.youtube_url || '',
    }));

    return NextResponse.json({
      success: true,
      config,
      catalog: mappedCatalog,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ success: false, error: 'Config data is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Save to site_settings
    await supabase
      .from('site_settings')
      .upsert({ key: 'assistant_config', value: config }, { onConflict: 'key' });

    // 2. Mirror to store_settings
    try {
      await supabase
        .from('store_settings')
        .upsert({ key: 'assistant_config', value: config }, { onConflict: 'key' });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Mipangilio ya Msaidizi wa AI imehifadhiwa kikamilifu!',
      config,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
