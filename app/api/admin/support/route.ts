import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_SUPPORT_CONFIG, SupportConfig } from '@/lib/supportDefaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'support_page_config')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const config: SupportConfig = data?.value ? { ...DEFAULT_SUPPORT_CONFIG, ...data.value } : DEFAULT_SUPPORT_CONFIG;

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, config: DEFAULT_SUPPORT_CONFIG },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Accept body.config, body.value, or entire body
    let configValue = body.config !== undefined ? body.config : (body.value !== undefined ? body.value : body);
    
    // If sent with key wrapper: { key: 'support_page_config', value: { ... } }
    if (body.key === 'support_page_config' && body.value !== undefined) {
      configValue = body.value;
    }

    if (!configValue || typeof configValue !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Mipangilio ya Support inahitajika (Invalid config payload)' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Save to site_settings
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'support_page_config', value: configValue }, { onConflict: 'key' });

    if (error) {
      throw error;
    }

    // 2. Also save to store_settings for complete sync
    try {
      await supabase
        .from('store_settings')
        .upsert({ key: 'support_page_config', value: configValue }, { onConflict: 'key' });
    } catch {}

    // 3. Realtime broadcast if channel is available
    try {
      const channel = supabase.channel('support-config-sync');
      await channel.send({
        type: 'broadcast',
        event: 'SUPPORT_CONFIG_UPDATED',
        payload: { config: configValue, updated_at: new Date().toISOString() },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Mipangilio ya Dawati la Msaada imehifadhiwa vizuri.',
      config: configValue,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
