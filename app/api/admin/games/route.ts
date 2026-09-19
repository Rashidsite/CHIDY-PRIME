import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcastStorefrontChange } from '@/lib/realtime-broadcast';

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
    
    // 1. Fetch site_settings for curated_new_games_feed list
    let curatedSet = new Set<string>();
    try {
      const { data: sData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'curated_new_games_feed')
        .maybeSingle();
      if (Array.isArray(sData?.value)) {
        curatedSet = new Set(sData.value);
      }
    } catch {}
    
    // 2. Fetch from posts (Primary DB table)
    const { data: postsData, error: postsErr } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsErr) {
      console.warn('Posts table query error:', postsErr.message);
    }

    // Process records
    const merged: any[] = [];

    if (postsData && Array.isArray(postsData)) {
      postsData.forEach((p) => {
        // Normalize links & extract direct_payment_url
        let linksList: { name: string; url: string }[] = [];
        let directPaymentUrl = p.direct_payment_url || '';
        if (Array.isArray(p.links)) {
          p.links.forEach((l: any) => {
            if (l && (l.name === 'DIRECT_PAYMENT_URL' || l.name === 'PAYMENT_REDIRECT' || l.type === 'direct_payment')) {
              if (!directPaymentUrl && l.url) directPaymentUrl = l.url;
            } else if (l && l.url) {
              linksList.push({
                name: l.name || l.label || 'Download File',
                url: l.url || '',
              });
            }
          });
        } else if (p.download_url) {
          linksList = [{ name: 'Download File', url: p.download_url }];
        }

        let rawCover = p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
        let rawScreenshots: string[] = [];
        let rawVideoUrl = p.youtube_url || p.video_url || '';
        let thumbnailType: 'image' | 'slideshow' | 'video' | 'auto' = p.thumbnail_type || (rawVideoUrl ? 'video' : 'auto');

        if (typeof rawCover === 'string' && rawCover.trim().startsWith('{')) {
          try {
            const parsedMedia = JSON.parse(rawCover);
            rawCover = parsedMedia.image || parsedMedia.cover || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
            if (Array.isArray(parsedMedia.screenshots)) rawScreenshots = parsedMedia.screenshots;
            if (parsedMedia.video) rawVideoUrl = parsedMedia.video;
            if (parsedMedia.thumbnail_type) thumbnailType = parsedMedia.thumbnail_type;
          } catch (e) {}
        }

        if (Array.isArray(p.screenshots)) {
          rawScreenshots = p.screenshots;
        } else if (typeof p.screenshots === 'string' && p.screenshots.trim()) {
          if (p.screenshots.trim().startsWith('[')) {
            try {
              rawScreenshots = JSON.parse(p.screenshots);
            } catch (e) {}
          } else {
            rawScreenshots = p.screenshots.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        const durLabel = formatDurationFromDays(p.duration_days);

        merged.push({
          id: p.id,
          title: p.title || 'Untitled Game',
          description: p.description || '',
          cover_image: rawCover,
          image_url: rawCover,
          screenshots: rawScreenshots,
          thumbnail_type: thumbnailType,
          price: Number(p.price || 0),
          rating: Number(p.rating || 4.8),
          category: p.category || 'MALEO BUS MODE TZ',
          status: p.status || 'published',
          duration_days: p.duration_days ?? 0,
          is_new_feed: curatedSet.has(p.id) || Boolean(p.is_new_feed),
          access_duration: durLabel,
          license_duration: durLabel,
          youtube_url: rawVideoUrl,
          video_url: rawVideoUrl,
          download_url: linksList[0]?.url || p.download_url || '',
          links: linksList,
          direct_payment_url: directPaymentUrl,
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
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
    const screenshots = Array.isArray(body.screenshots) ? body.screenshots.filter((s: any) => typeof s === 'string' && s.trim()) : [];
    const thumbnailType = body.thumbnail_type || (youtubeUrl ? 'video' : screenshots.length > 0 ? 'slideshow' : 'image');
    
    const directPaymentUrl = body.direct_payment_url?.trim() || '';

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

    if (directPaymentUrl) {
      links.push({ name: 'DIRECT_PAYMENT_URL', url: directPaymentUrl });
    }

    const durationDays = parseDurationDays(body.access_duration || body.license_duration);
    const isNewFeed = body.is_new_feed !== undefined ? Boolean(body.is_new_feed) : false;

    // 1. Insert into posts table (Primary)
    const insertPayload: Record<string, any> = {
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
    };

    if (directPaymentUrl) {
      insertPayload.direct_payment_url = directPaymentUrl;
    }

    if (screenshots.length > 0) {
      insertPayload.screenshots = screenshots;
    }

    let newPost = null;
    let { data: pData, error: pErr } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select()
      .single();

    if (pErr) {
      // Resilient fallback: If column direct_payment_url or screenshots is missing, retry safely
      if (pErr.message && (pErr.message.includes('direct_payment_url') || pErr.message.includes('screenshots'))) {
        delete insertPayload.direct_payment_url;
        if (pErr.message.includes('screenshots')) {
          delete insertPayload.screenshots;
          if (screenshots.length > 0) {
            insertPayload.image_url = JSON.stringify({
              image: imageUrl,
              screenshots,
              video: youtubeUrl,
              thumbnail_type: thumbnailType,
            });
          }
        }
        const retryResult = await supabase
          .from('posts')
          .insert(insertPayload)
          .select()
          .single();
        if (retryResult.error) throw retryResult.error;
        pData = retryResult.data;
      } else {
        console.error('Error inserting to posts:', pErr);
        throw pErr;
      }
    }
    newPost = pData;

    // 2. If isNewFeed, add to site_settings curated_new_games_feed
    if (newPost?.id && isNewFeed) {
      try {
        const { data: sData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'curated_new_games_feed')
          .maybeSingle();
        let currentList: string[] = Array.isArray(sData?.value) ? [...sData.value] : [];
        if (!currentList.includes(newPost.id)) currentList.push(newPost.id);
        await supabase
          .from('site_settings')
          .upsert({ key: 'curated_new_games_feed', value: currentList }, { onConflict: 'key' });
      } catch {}
    }

    // Broadcast instant realtime sync to front-end
    await broadcastStorefrontChange('GAME_CREATED', { id: newPost?.id, game: newPost });

    return NextResponse.json({
      success: true,
      game: {
        ...newPost,
        cover_image: newPost.image_url,
        access_duration: body.access_duration || 'Lifetime',
        is_new_feed: isNewFeed,
        direct_payment_url: directPaymentUrl,
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

    // 1. Handle is_new_feed in site_settings (100% resilient storage)
    if (updates.is_new_feed !== undefined) {
      const feedVal = Boolean(updates.is_new_feed);
      try {
        const { data: sData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'curated_new_games_feed')
          .maybeSingle();
        let currentList: string[] = Array.isArray(sData?.value) ? [...sData.value] : [];
        if (feedVal) {
          if (!currentList.includes(id)) currentList.push(id);
        } else {
          currentList = currentList.filter((x) => x !== id);
        }
        await supabase
          .from('site_settings')
          .upsert({ key: 'curated_new_games_feed', value: currentList }, { onConflict: 'key' });
        try {
          await supabase
            .from('store_settings')
            .upsert({ key: 'curated_new_games_feed', value: currentList }, { onConflict: 'key' });
        } catch {}
      } catch (sErr) {
        console.warn('site_settings sync warning:', sErr);
      }
    }

    // 2. Prepare updates for posts table if other fields were changed
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
    if (updates.screenshots !== undefined) {
      postPayload.screenshots = Array.isArray(updates.screenshots)
        ? updates.screenshots.filter((s: any) => typeof s === 'string' && s.trim())
        : [];
    }
    if (updates.access_duration !== undefined || updates.license_duration !== undefined) {
      postPayload.duration_days = parseDurationDays(updates.access_duration || updates.license_duration);
    }
    
    // Process links array
    const directPaymentUrl = updates.direct_payment_url !== undefined ? updates.direct_payment_url.trim() : undefined;

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

    if (directPaymentUrl !== undefined) {
      postPayload.direct_payment_url = directPaymentUrl;
      if (postPayload.links) {
        postPayload.links = postPayload.links.filter((l: any) => l && l.name !== 'DIRECT_PAYMENT_URL' && l.name !== 'PAYMENT_REDIRECT');
        if (directPaymentUrl) {
          postPayload.links.push({ name: 'DIRECT_PAYMENT_URL', url: directPaymentUrl });
        }
      } else {
        try {
          const { data: currentPost } = await supabase.from('posts').select('links').eq('id', id).single();
          let existingLinks = Array.isArray(currentPost?.links) ? [...currentPost.links] : [];
          existingLinks = existingLinks.filter((l: any) => l && l.name !== 'DIRECT_PAYMENT_URL' && l.name !== 'PAYMENT_REDIRECT');
          if (directPaymentUrl) {
            existingLinks.push({ name: 'DIRECT_PAYMENT_URL', url: directPaymentUrl });
          }
          postPayload.links = existingLinks;
        } catch {}
      }
    }

    let updatedPost: any = null;

    // Only update posts table if there are postPayload fields to update
    if (Object.keys(postPayload).length > 0) {
      let { data: pData, error: pErr } = await supabase
        .from('posts')
        .update(postPayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (pErr) {
        // Resilient fallback: If error was missing direct_payment_url or screenshots, retry safely
        if (pErr.message && (pErr.message.includes('direct_payment_url') || pErr.message.includes('screenshots'))) {
          if (pErr.message.includes('direct_payment_url')) {
            delete postPayload.direct_payment_url;
          }
          if (pErr.message.includes('screenshots')) {
            const screens = postPayload.screenshots || [];
            delete postPayload.screenshots;
            if (screens.length > 0) {
              postPayload.image_url = JSON.stringify({
                image: postPayload.image_url || updates.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
                screenshots: screens,
                video: postPayload.youtube_url || updates.video_url || '',
                thumbnail_type: updates.thumbnail_type || (postPayload.youtube_url ? 'video' : 'slideshow'),
              });
            }
          }
          const retryRes = await supabase
            .from('posts')
            .update(postPayload)
            .eq('id', id)
            .select()
            .maybeSingle();
          if (retryRes.error) throw retryRes.error;
          pData = retryRes.data;
        } else {
          console.error('Error updating posts table:', pErr);
          throw pErr;
        }
      }
      updatedPost = pData;
    }

    // Broadcast instant realtime sync to front-end
    await broadcastStorefrontChange('GAME_UPDATED', { id, updates });

    return NextResponse.json({
      success: true,
      game: {
        id,
        ...(updatedPost || {}),
        is_new_feed: Boolean(updates.is_new_feed),
        direct_payment_url: directPaymentUrl !== undefined ? directPaymentUrl : (updatedPost?.direct_payment_url || ''),
      },
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

    // Broadcast instant realtime sync to front-end
    await broadcastStorefrontChange('GAME_DELETED', { id });

    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
