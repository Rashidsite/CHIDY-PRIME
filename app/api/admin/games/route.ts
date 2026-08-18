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

    const insertPayload = {
      ...gameData,
      access_duration: gameData.access_duration || 'Lifetime',
      license_duration: gameData.access_duration || 'Lifetime',
      status: gameData.status || 'published',
      slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
    };

    const { data: newGame, error } = await supabase
      .from('games')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // Also fallback/sync to posts table
      const { data: postFallback, error: pErr } = await supabase
        .from('posts')
        .insert({
          title: gameData.title,
          price: gameData.price,
          category: gameData.category,
          description: gameData.description,
          image_url: gameData.cover_image,
          download_url: gameData.download_url,
          access_duration: gameData.access_duration || 'Lifetime',
          status: gameData.status || 'published',
        })
        .select()
        .single();
      if (pErr) throw error;
      return NextResponse.json({ success: true, game: postFallback });
    }

    return NextResponse.json({ success: true, game: newGame });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required for editing' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.price !== undefined) updatePayload.price = Number(updates.price);
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.cover_image !== undefined) {
      updatePayload.cover_image = updates.cover_image;
      updatePayload.image_url = updates.cover_image;
    }
    if (updates.download_url !== undefined) updatePayload.download_url = updates.download_url;
    if (updates.access_duration !== undefined) {
      updatePayload.access_duration = updates.access_duration;
      updatePayload.license_duration = updates.access_duration;
    }
    if (updates.status !== undefined) updatePayload.status = updates.status;

    // 1. Try update games table
    const { data: updatedGame, error: gErr } = await supabase
      .from('games')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // 2. Try update posts table
    const { data: updatedPost } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (gErr && !updatedPost) {
      throw gErr;
    }

    return NextResponse.json({
      success: true,
      game: updatedGame || updatedPost,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase.from('games').delete().eq('id', id);
    await supabase.from('posts').delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'Game deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
