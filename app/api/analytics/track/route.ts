export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { game_id, type } = await req.json();

    if (!game_id || !type) {
      return NextResponse.json({ success: false, error: 'Missing game_id or type' }, { status: 400 });
    }

    if (type === 'view') {
      const { data } = await supabaseAdmin
        .from('posts')
        .select('views')
        .eq('id', game_id)
        .maybeSingle();

      if (data) {
        await supabaseAdmin
          .from('posts')
          .update({ views: (Number(data.views) || 0) + 1 })
          .eq('id', game_id);
      }
    } else if (type === 'click') {
      const { data } = await supabaseAdmin
        .from('posts')
        .select('views')
        .eq('id', game_id)
        .maybeSingle();

      if (data) {
        await supabaseAdmin
          .from('posts')
          .update({ views: (Number(data.views) || 0) + 1 })
          .eq('id', game_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
