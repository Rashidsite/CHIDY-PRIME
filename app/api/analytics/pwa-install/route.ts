import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { data: currentData } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'pwa_installs_count')
      .maybeSingle();

    const currentCount = Number(currentData?.value?.count || currentData?.value || 0);
    const newCount = currentCount + 1;

    await supabaseAdmin
      .from('site_settings')
      .upsert({ key: 'pwa_installs_count', value: { count: newCount, updated_at: new Date().toISOString() } });

    return NextResponse.json({ success: true, count: newCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
