import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Fetch all site_settings and store_settings
    const { data: siteData } = await supabase.from('site_settings').select('*');
    const { data: storeData } = await supabase.from('store_settings').select('*');

    const mergedSettings: Record<string, any> = {};

    if (siteData && Array.isArray(siteData)) {
      siteData.forEach((s) => {
        mergedSettings[s.key] = s.value;
      });
    }

    if (storeData && Array.isArray(storeData)) {
      storeData.forEach((s) => {
        mergedSettings[s.key] = s.value;
      });
    }

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      background: mergedSettings.custom_background || {
        enabled: true,
        image_url: '/game_controller_bg.jpg',
        opacity: 0.45,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key and Value are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Save to site_settings
    await supabase
      .from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    // 2. Also save to store_settings for complete sync
    await supabase
      .from('store_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    // 3. Broadcast update to storefront-sync channel
    try {
      const channel = supabase.channel('storefront-sync');
      await channel.send({
        type: 'broadcast',
        event: 'STORE_SETTINGS_UPDATED',
        payload: { key, value },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Setting '${key}' updated successfully`,
      key,
      value,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
