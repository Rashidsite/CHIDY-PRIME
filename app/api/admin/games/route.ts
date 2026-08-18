import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function parseDurationDays(dur?: string): number {
  if (!dur) return 0;
  const l = dur.toLowerCase();
  if (l.includes('lifetime') || l.includes('maisha')) return 0;
  if (l.includes('30') || l.includes('month') || l.includes('mwezi')) return 30;
  if (l.includes('7') || l.includes('week') || l.includes('wiki')) return 7;
  if (l.includes('24') || l.includes('day') || l.includes('siku') || l.includes('1 day')) return 1;
  if (l.includes('2 hour') || l.includes('2 hrs') || l.includes('masaa 2') || l.includes('2 hours')) return 2;
  const num = parseInt(dur.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : Math.round(num);
}

function formatDurationFromDays(days?: number): string {
  if (days === undefined || days === null || days === 0 || days >= 365) return 'Lifetime';
  if (days === 30) return '30 Days';
  if (days === 7) return '7 Days';
  if (days === 1) return '24 Hours';
  if (days === 2) return '2 Hours';
  return `${days} Days`;
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // 1. Fetch from posts (Primary DB table)
    const { data: postsData, error: postsErr } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsErr) {
      console.warn('Posts table query error:', postsErr.message);
    }

    // 2. Fetch from games if table exists
    let gamesData: any[] = [];
    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) gamesData = data;
    } catch {}

    // Merge records
    const merged: any[] = [];
    const seenIds = new Set<string>();

    if (postsData && Array.isArray(postsData)) {
      postsData.forEach((p) => {
        seenIds.add(p.id);
        
        // Normalize links
        let linksList: { name: string; url: string }[] = [];
        if (Array.isArray(p.links)) {
          linksList = p.links.map((l: any) => ({
            name: l.name || l.label || 'Download File',
            url: l.url || '',
          }));
        } else if (p.download_url) {
          linksList = [{ name: 'Download File', url: p.download_url }];
        }

        const durLabel = formatDurationFromDays(p.duration_days);

        merged.push({
          id: p.id,
          title: p.title || 'Untitled Game',
          description: p.description || '',
          cover_image: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
          image_url: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
          price: Number(p.price || 0),
          rating: Number(p.rating || 4.8),
          category: p.category || 'MALEO BUS MODE TZ',
          status: p.status || 'published',
          duration_days: p.duration_days ?? 0,
          access_duration: durLabel,
          license_duration: durLabel,
          youtube_url: p.youtube_url || p.video_url || '',
          video_url: p.youtube_url || p.video_url || '',
          download_url: linksList[0]?.url || p.download_url || '',
          links: linksList,
          download_links: linksList,
          created_at: p.created_at,
        });
      });
    }

    if (gamesData.length > 0) {
      gamesData.forEach((g) => {
        if (!seenIds.has(g.id)) {
          merged.push(g);
        }
      });
    }

    return NextResponse.json({ success: true, games: merged });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const title = body.title?.trim() || 'Untitled Product';
    const price = Number(body.price || 0);
    const category = body.category?.trim() || 'MALEO BUS MODE TZ';
    const description = body.description?.trim() || '';
    const rating = Number(body.rating || 4.8);
    const status = body.status || 'published';
    const imageUrl = body.cover_image?.trim() || body.image_url?.trim() || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
    const youtubeUrl = body.video_url?.trim() || body.youtube_url?.trim() || '';
    
    // Process Multi-Links
    let links: { name: string; url: string }[] = [];
    if (Array.isArray(body.links) && body.links.length > 0) {
      links = body.links
        .filter((l: any) => l && l.url && l.url.trim())
        .map((l: any) => ({
          name: (l.name || l.label || 'Download File').trim(),
          url: l.url.trim(),
        }));
    } else if (body.download_url?.trim()) {
      links = [{ name: 'Download File', url: body.download_url.trim() }];
    }

    const durationDays = parseDurationDays(body.access_duration || body.license_duration);

    // 1. Insert into posts table (Primary)
    const { data: newPost, error: pErr } = await supabase
      .from('posts')
      .insert({
        title,
        price,
        category,
        description,
        image_url: imageUrl,
        rating,
        youtube_url: youtubeUrl,
        links,
        status,
        duration_days: durationDays,
        sort_order: 9999,
      })
      .select()
      .single();

    if (pErr) {
      console.error('Error inserting to posts:', pErr);
      throw pErr;
    }

    // 2. Also try insert to games table if exists
    try {
      await supabase.from('games').insert({
        id: newPost.id,
        title,
        price,
        category,
        description,
        cover_image: imageUrl,
        rating,
        status,
        access_duration: body.access_duration || 'Lifetime',
        download_url: links[0]?.url || '',
        download_links: links,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      game: {
        ...newPost,
        cover_image: newPost.image_url,
        access_duration: body.access_duration || 'Lifetime',
        links,
      },
      message: 'Product published successfully',
    });
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

    // Prepare updates for posts table
    const postPayload: Record<string, any> = {};
    if (updates.title !== undefined) postPayload.title = updates.title.trim();
    if (updates.price !== undefined) postPayload.price = Number(updates.price);
    if (updates.category !== undefined) postPayload.category = updates.category.trim();
    if (updates.description !== undefined) postPayload.description = updates.description.trim();
    if (updates.rating !== undefined) postPayload.rating = Number(updates.rating);
    if (updates.status !== undefined) postPayload.status = updates.status;
    if (updates.cover_image !== undefined || updates.image_url !== undefined) {
      postPayload.image_url = (updates.cover_image || updates.image_url).trim();
    }
    if (updates.video_url !== undefined || updates.youtube_url !== undefined) {
      postPayload.youtube_url = (updates.video_url || updates.youtube_url).trim();
    }
    if (updates.access_duration !== undefined || updates.license_duration !== undefined) {
      postPayload.duration_days = parseDurationDays(updates.access_duration || updates.license_duration);
    }
    
    // Process links array
    if (Array.isArray(updates.links)) {
      postPayload.links = updates.links
        .filter((l: any) => l && l.url && l.url.trim())
        .map((l: any) => ({
          name: (l.name || l.label || 'Download File').trim(),
          url: l.url.trim(),
        }));
    } else if (updates.download_url !== undefined) {
      postPayload.links = [{ name: 'Download File', url: updates.download_url.trim() }];
    }

    // 1. Update posts table
    const { data: updatedPost, error: pErr } = await supabase
      .from('posts')
      .update(postPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (pErr) {
      console.error('Error updating posts table:', pErr);
      throw pErr;
    }

    // 2. Also try updating games table
    try {
      const gamePayload: Record<string, any> = { ...postPayload };
      if (postPayload.image_url) gamePayload.cover_image = postPayload.image_url;
      if (updates.access_duration) gamePayload.access_duration = updates.access_duration;
      await supabase.from('games').update(gamePayload).eq('id', id);
    } catch {}

    return NextResponse.json({
      success: true,
      game: updatedPost,
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
    await supabase.from('posts').delete().eq('id', id);
    try {
      await supabase.from('games').delete().eq('id', id);
    } catch {}

    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
