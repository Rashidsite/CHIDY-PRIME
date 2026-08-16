import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GameSchema } from '@/lib/zod/schemas';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, games });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = GameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const gameData = validation.data;
    const slug = slugify(gameData.title);
    const supabase = createAdminClient();

    const { data: newGame, error } = await supabase
      .from('games')
      .insert({
        ...gameData,
        slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, game: newGame });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('games').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Game deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
