import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Fetch raw categories from database
    const { data: categories, error: cError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (cError) throw cError;

    // 2. Fetch category metadata from store_settings
    let metadata = {};
    try {
      const { data: settingsData } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'category_metadata')
        .single();
      if (settingsData?.value) {
        metadata = settingsData.value;
      }
    } catch (e) {
      console.warn('Failed to load category_metadata from store_settings:', e);
    }

    // 3. Merge metadata with categories
    const merged = (categories || []).map((cat: any) => {
      const meta = (metadata as any)[cat.name] || {};
      return {
        ...cat,
        image_url: meta.image_url || '',
        description: meta.description || '',
        badge_text: meta.badge_text || 'MODS & GAMES',
      };
    });

    return NextResponse.json({ success: true, categories: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, display_order, is_visible, image_url, description, badge_text } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    // 1. Insert into categories table (only columns that exist)
    const { data: newCat, error: insertError } = await supabaseAdmin
      .from('categories')
      .insert({
        name,
        display_order: display_order || 0,
        is_visible: is_visible ?? true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Update category_metadata in store_settings
    try {
      const { data: settingsData } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'category_metadata')
        .single();

      const currentMetadata = settingsData?.value || {};
      const newMetadata = {
        ...currentMetadata,
        [name]: {
          image_url: image_url || '',
          description: description || '',
          badge_text: badge_text || 'MODS & GAMES',
        }
      };

      const { error: settingsError } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: 'category_metadata', value: newMetadata });

      if (settingsError) throw settingsError;
    } catch (e: any) {
      console.error('Failed to update category_metadata during category creation:', e.message);
    }

    // Return merged response
    return NextResponse.json({
      success: true,
      category: {
        ...newCat,
        image_url: image_url || '',
        description: description || '',
        badge_text: badge_text || 'MODS & GAMES',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, display_order, is_visible, image_url, description, badge_text, old_name } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    // 1. Update basic columns in categories table
    const categoryUpdates: any = {};
    if (name !== undefined) categoryUpdates.name = name;
    if (display_order !== undefined) categoryUpdates.display_order = Number(display_order);
    if (is_visible !== undefined) categoryUpdates.is_visible = is_visible;

    let updatedCat = null;
    if (Object.keys(categoryUpdates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .update(categoryUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      updatedCat = data;
    }

    // 2. Update metadata in store_settings table
    try {
      const { data: settingsData } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'category_metadata')
        .single();

      const currentMetadata = settingsData?.value || {};
      const newMetadata = { ...currentMetadata };

      const oldCategoryKey = old_name || name;
      const oldMeta = currentMetadata[oldCategoryKey] || {};

      const newMeta = {
        image_url: image_url !== undefined ? image_url : oldMeta.image_url || '',
        description: description !== undefined ? description : oldMeta.description || '',
        badge_text: badge_text !== undefined ? badge_text : oldMeta.badge_text || 'MODS & GAMES',
      };

      // Handle category rename: remove old key if name changed
      if (oldCategoryKey && oldCategoryKey !== name && name) {
        delete newMetadata[oldCategoryKey];
      }

      const activeKey = name || oldCategoryKey;
      if (activeKey) {
        newMetadata[activeKey] = newMeta;
      }

      const { error: settingsError } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: 'category_metadata', value: newMetadata });

      if (settingsError) throw settingsError;
    } catch (e: any) {
      console.error('Failed to update category_metadata during category update:', e.message);
    }

    return NextResponse.json({
      success: true,
      category: {
        ...(updatedCat || {}),
        image_url: image_url || '',
        description: description || '',
        badge_text: badge_text || 'MODS & GAMES',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name'); // Optional: delete from metadata as well

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    // 1. Delete category row
    const { error: deleteError } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (deleteError) throw deleteError;

    // 2. Clean up from metadata JSON
    if (name) {
      try {
        const { data: settingsData } = await supabaseAdmin
          .from('site_settings')
          .select('value')
          .eq('key', 'category_metadata')
          .single();

        if (settingsData?.value) {
          const currentMetadata = settingsData.value;
          if (currentMetadata[name]) {
            const newMetadata = { ...currentMetadata };
            delete newMetadata[name];
            await supabaseAdmin
              .from('site_settings')
              .upsert({ key: 'category_metadata', value: newMetadata });
          }
        }
      } catch (e: any) {
        console.warn('Failed to clean metadata during category deletion:', e.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
