import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseSquadData, cleanRedirectUrl } from '@/lib/efootball-squads';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Query all matching squad categories
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .or('category.ilike.%vikosi%,category.ilike.%efootball%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API /api/admin/vikosi GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Filter to true squads
    const squadPosts = (data || []).filter((p: any) => {
      const cat = (p.category || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      if (cat.includes('vikosi')) return true;
      if (cat.includes('efootball') && !cat.includes('football games')) return true;
      if (title.includes('kikosi')) return true;
      return false;
    });

    const parsed = squadPosts.map((item: any) => parseSquadData(item));

    return NextResponse.json({
      success: true,
      squads: parsed,
      count: parsed.length,
    });
  } catch (err: any) {
    console.error('API /api/admin/vikosi GET unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const { error, data } = await supabase
      .from('posts')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, squad: parseSquadData(data) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateFields } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Squad ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error, data } = await supabase
      .from('posts')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, squad: parseSquadData(data) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Squad ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
