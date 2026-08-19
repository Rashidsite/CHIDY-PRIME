import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_CMS_CONFIG, CMSConfigData } from '@/lib/cmsDefaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['cms_bottom_nav', 'cms_animations', 'cms_theme_presets']);

    const cmsData: CMSConfigData = { ...DEFAULT_CMS_CONFIG };

    if (settings && Array.isArray(settings)) {
      settings.forEach((s) => {
        if (s.key === 'cms_bottom_nav' && s.value) {
          cmsData.bottom_nav = {
            ...s.value,
            items: Array.isArray(s.value.items)
              ? s.value.items.map((it: any) =>
                  it.id === 'nav-chat' || (it.label || '').toLowerCase().includes('msaada')
                    ? { ...it, url: '/support' }
                    : it
                )
              : s.value.items,
          };
        }
        if (s.key === 'cms_animations' && s.value) cmsData.animations = s.value;
        if (s.key === 'cms_theme_presets' && s.value) cmsData.theme_presets = s.value;
      });
    }

    return NextResponse.json({
      success: true,
      config: cmsData,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      config: DEFAULT_CMS_CONFIG,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bottom_nav, animations, theme_presets } = body;

    const supabase = createAdminClient();

    const upserts = [];
    if (bottom_nav !== undefined) {
      upserts.push({ key: 'cms_bottom_nav', value: bottom_nav });
    }
    if (animations !== undefined) {
      upserts.push({ key: 'cms_animations', value: animations });
    }
    if (theme_presets !== undefined) {
      upserts.push({ key: 'cms_theme_presets', value: theme_presets });
    }

    for (const item of upserts) {
      await supabase.from('site_settings').upsert(item, { onConflict: 'key' });
      try {
        await supabase.from('store_settings').upsert(item, { onConflict: 'key' });
      } catch {}
    }

    // Broadcast realtime event
    try {
      const channel = supabase.channel('cms-theme-sync');
      await channel.send({
        type: 'broadcast',
        event: 'CMS_THEME_UPDATED',
        payload: { bottom_nav, animations, theme_presets, updated_at: new Date().toISOString() },
      });
    } catch (e) {
      console.warn('Realtime broadcast notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'UI & Theme CMS configurations updated and broadcast in Realtime successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
