export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    // 3. Fetch from products if exists
    let productsData: any[] = [];
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) productsData = data;
    } catch {}

    const merged: any[] = [];
    const seenIds = new Set<string>();

    if (postsData && Array.isArray(postsData)) {
      postsData.forEach((p) => {
        if (p.status === 'draft' || p.status === 'archived' || p.is_active === false) return;
        seenIds.add(p.id);
        const dur = p.plan_duration || p.access_duration || p.license_duration || formatDurationFromDays(p.duration_days);
        merged.push({
          id: p.id,
          title: p.title || 'Untitled Game',
          price: Number(p.price || 0),
          category: p.category || 'PC Games',
          description: p.description || '',
          cover_image: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
          image_url: p.image_url || p.cover_image,
          rating: Number(p.rating || 4.8),
          status: p.status || 'published',
          is_active: p.is_active !== false,
          is_new_feed: curatedSet.has(p.id) || Boolean(p.is_new_feed),
          access_duration: dur || 'Lifetime',
          license_duration: dur || 'Lifetime',
          plan_duration: dur || 'Lifetime',
          duration_days: p.duration_days ?? parseDurationDays(dur),
          download_url: (Array.isArray(p.links) && p.links[0]?.url) || p.download_url || '',
          links: Array.isArray(p.links) ? p.links : (p.download_url ? [{ title: 'Main Download', url: p.download_url }] : []),
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      });
    }

    if (productsData && Array.isArray(productsData)) {
      productsData.forEach((g) => {
        if (g.status === 'draft' || g.status === 'archived' || g.is_active === false) return;
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          const dur = g.access_duration || 'Lifetime';
          merged.push({
            id: g.id,
            title: g.title || 'Untitled Game',
            price: Number(g.price || 0),
            category: g.category || 'PC Games',
            description: g.description || '',
            cover_image: g.cover_image || g.image_url || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
            image_url: g.image_url || g.cover_image,
            rating: Number(g.rating || 4.8),
            status: g.status || 'published',
            is_active: g.is_active !== false,
            is_new_feed: curatedSet.has(g.id) || Boolean(g.is_new_feed),
            access_duration: dur,
            plan_duration: dur,
            license_duration: dur,
            duration_days: parseDurationDays(dur),
            download_url: g.download_url || '',
            links: Array.isArray(g.download_links) ? g.download_links : (g.download_url ? [{ title: 'Main Download', url: g.download_url }] : []),
            created_at: g.created_at,
            updated_at: g.updated_at,
          });
        }
      });
    }

    return NextResponse.json(
      { success: true, games: merged },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
