export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Helper to check if error is table missing error
function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes("could not find the table 'public.slides'") ||
    msg.includes('relation "public.slides" does not exist') ||
    msg.includes('relation "slides" does not exist') ||
    err.code === '42P01' ||
    err.code === 'PGRST301'
  );
}

// Fallback to site_settings table when `slides` table is not present
async function getSlidesFromSettings() {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('value')
    .eq('key', 'cms_slides')
    .maybeSingle();

  return (data?.value as any[]) || [];
}

async function saveSlidesToSettings(slides: any[]) {
  await supabaseAdmin
    .from('site_settings')
    .upsert({ key: 'cms_slides', value: slides });
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('slides')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        const slides = await getSlidesFromSettings();
        return NextResponse.json({ success: true, slides });
      }
      throw error;
    }

    return NextResponse.json({ success: true, slides: data || [] });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      const slides = await getSlidesFromSettings();
      return NextResponse.json({ success: true, slides });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, subtitle, image_url, tag, cta_text, cta_link, sort_order, is_active } = body;

    if (!title || !image_url) {
      return NextResponse.json({ success: false, error: 'Title and Image URL are required' }, { status: 400 });
    }

    const newSlide = {
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      subtitle: subtitle || '',
      image_url,
      tag: tag || 'CHIDY PRIME EXCLUSIVE',
      cta_text: cta_text || 'EXPLORE NOW',
      cta_link: cta_link || '#catalog',
      sort_order: sort_order || 0,
      is_active: is_active ?? true,
      created_at: new Date().toISOString(),
    };

    // Try inserting into 'slides' table
    const { data, error } = await supabaseAdmin
      .from('slides')
      .insert({
        title: newSlide.title,
        subtitle: newSlide.subtitle,
        image_url: newSlide.image_url,
        tag: newSlide.tag,
        cta_text: newSlide.cta_text,
        cta_link: newSlide.cta_link,
        sort_order: newSlide.sort_order,
        is_active: newSlide.is_active,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const currentSlides = await getSlidesFromSettings();
        const updated = [...currentSlides, newSlide];
        await saveSlidesToSettings(updated);
        return NextResponse.json({ success: true, slide: newSlide });
      }
      throw error;
    }

    return NextResponse.json({ success: true, slide: data || newSlide });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      try {
        const body = await req.json();
        const currentSlides = await getSlidesFromSettings();
        const newSlide = {
          id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...body,
          created_at: new Date().toISOString(),
        };
        const updated = [...currentSlides, newSlide];
        await saveSlidesToSettings(updated);
        return NextResponse.json({ success: true, slide: newSlide });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Slide ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('slides')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const currentSlides = await getSlidesFromSettings();
        const updated = currentSlides.map((s) => (s.id === id ? { ...s, ...updates } : s));
        await saveSlidesToSettings(updated);
        return NextResponse.json({ success: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true, slide: data });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      const body = await req.json();
      const { id, ...updates } = body;
      const currentSlides = await getSlidesFromSettings();
      const updated = currentSlides.map((s) => (s.id === id ? { ...s, ...updates } : s));
      await saveSlidesToSettings(updated);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Slide ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('slides').delete().eq('id', id);
    if (error) {
      if (isMissingTableError(error)) {
        const currentSlides = await getSlidesFromSettings();
        const updated = currentSlides.filter((s) => s.id !== id);
        await saveSlidesToSettings(updated);
        return NextResponse.json({ success: true, message: 'Slide deleted successfully' });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Slide deleted successfully' });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      const currentSlides = await getSlidesFromSettings();
      const updated = currentSlides.filter((s) => s.id !== id);
      await saveSlidesToSettings(updated);
      return NextResponse.json({ success: true, message: 'Slide deleted successfully' });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
