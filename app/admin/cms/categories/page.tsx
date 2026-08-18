'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { Plus, Trash2, Layers, Eye, EyeOff, X, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminCmsCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldName, setOldName] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText, setBadgeText] = useState('HOT MODS');
  const [sortOrder, setSortOrder] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories from table
      const { data: categoriesData, error: cError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (cError) throw cError;

      // 2. Fetch metadata from store_settings
      let metadata: any = {};
      try {
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'category_metadata')
          .single();
        if (settingsData?.value) {
          metadata = settingsData.value;
        }
      } catch (e) {}

      // 3. Merge metadata with categories
      const merged = (categoriesData || []).map((cat: any) => {
        const meta = metadata[cat.name] || {};
        return {
          ...cat,
          image_url: meta.image_url || '',
          description: meta.description || '',
          badge_text: meta.badge_text || 'MODS & GAMES',
        };
      });

      setCategories(merged);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop');
    setBadgeText('HOT MODS');
    setSortOrder('0');
    setModalMode('add');
    setEditingId(null);
    setOldName('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setName(c.name || '');
    setDescription(c.description || '');
    setImageUrl(c.image_url || '');
    setBadgeText(c.badge_text || 'HOT MODS');
    setSortOrder(String(c.display_order || 0));
    setModalMode('edit');
    setEditingId(c.id);
    setOldName(c.name || '');
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let savedCategory = null;

      if (modalMode === 'edit') {
        // 1. Update basic columns in categories table
        const { data, error } = await supabase
          .from('categories')
          .update({
            name,
            display_order: Number(sortOrder),
          })
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        savedCategory = data;
      } else {
        // 1. Insert into categories table
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name,
            display_order: Number(sortOrder),
            is_visible: true,
          })
          .select()
          .single();
        if (error) throw error;
        savedCategory = data;
      }

      // 2. Load and update category_metadata JSON in store_settings
      let metadata: any = {};
      try {
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'category_metadata')
          .single();
        if (settingsData?.value) {
          metadata = settingsData.value;
        }
      } catch (e) {}

      const newMetadata = { ...metadata };
      const oldCategoryKey = oldName || name;
      const oldMeta = metadata[oldCategoryKey] || {};

      const newMeta = {
        image_url: imageUrl,
        description,
        badge_text: badgeText,
      };

      // Handle rename: remove old key
      if (modalMode === 'edit' && oldCategoryKey && oldCategoryKey !== name) {
        delete newMetadata[oldCategoryKey];
      }
      newMetadata[name] = newMeta;

      const { error: settingsError } = await supabase
        .from('site_settings')
        .upsert({ key: 'category_metadata', value: newMetadata });

      if (settingsError) throw settingsError;

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisible = async (id: string, currentVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_visible: !currentVisible })
        .eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      alert('Toggle visible failed');
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      // 1. Delete from categories table
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;

      // 2. Clean up metadata
      let metadata: any = {};
      try {
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'category_metadata')
          .single();
        if (settingsData?.value) {
          metadata = settingsData.value;
        }
      } catch (e) {}

      if (metadata[catName]) {
        const newMetadata = { ...metadata };
        delete newMetadata[catName];
        await supabase
          .from('site_settings')
          .upsert({ key: 'category_metadata', value: newMetadata });
      }

      fetchCategories();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <Layers className="w-8 h-8 text-blue-500" />
            <span>CMS: Category Cards & Filtering Control</span>
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Manage category cards displayed on the storefront home page. Edit names, cover art, badges, and display ordering.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold uppercase shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Category</span>
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 font-bold uppercase text-xs animate-pulse">Loading Categories...</div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                  <th className="pb-3.5">Cover Art</th>
                  <th className="pb-3.5">Category Name</th>
                  <th className="pb-3.5">Badge & Description</th>
                  <th className="pb-3.5">Display Order</th>
                  <th className="pb-3.5">Visibility</th>
                  <th className="pb-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4">
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        {c.image_url ? (
                          <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600 text-xs">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 font-extrabold text-white max-w-xs truncate text-base">{c.name}</td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-xs uppercase block w-fit mb-1">
                        {c.badge_text || 'CATEGORY'}
                      </span>
                      <span className="text-xs text-slate-300 font-medium line-clamp-1">{c.description}</span>
                    </td>
                    <td className="py-4 font-extrabold text-slate-300">{c.display_order ?? 0}</td>
                    <td className="py-4">
                      <button
                        onClick={() => handleToggleVisible(c.id, c.is_visible)}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs uppercase flex items-center gap-1.5 border ${
                          c.is_visible
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {c.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>{c.is_visible ? 'Visible' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full relative shadow-card space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white uppercase">
                {modalMode === 'edit' ? 'Edit Storefront Category Card' : 'Add Storefront Category Card'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maleo Bus Mods TZ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Cover Art Image (ImgBB Hosted)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs truncate"
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setImageUrl(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Badge Tag</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Display Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Description</label>
                <textarea
                  rows={2}
                  placeholder="Category description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-wider shadow-md transition-colors text-sm"
              >
                {submitting ? 'Saving...' : modalMode === 'edit' ? 'Update Category Card' : 'Save Category Card'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
