'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { Plus, Trash2, Layers, Eye, EyeOff, X, Pencil, Gamepad2, Trophy, ChevronRight, Sparkles } from 'lucide-react';
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
  const [badgeText, setBadgeText] = useState('MODS & GAMES');
  const [sortOrder, setSortOrder] = useState('1');
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

      // 3. Fetch published games to count games per category
      let gamesData: any[] = [];
      try {
        const { data: pData } = await supabase
          .from('posts')
          .select('id, category, status');
        if (pData && pData.length > 0) {
          gamesData = pData.filter((p: any) => p.status !== 'draft' && p.status !== 'archived');
        } else {
          const { data: gData } = await supabase.from('games').select('id, category');
          if (gData) gamesData = gData;
        }
      } catch (e) {}

      // 4. Merge metadata & count with categories
      const merged = (categoriesData || []).map((cat: any) => {
        const meta = metadata[cat.name] || {};
        const fc = (cat.name || '').toLowerCase().replace(/s$/i, '').trim();
        const count = gamesData.filter((g: any) => {
          if (!g.category) return false;
          const gc = String(g.category).toLowerCase().replace(/s$/i, '').trim();
          const isLiveTvMatch =
            (gc.replace(/_/g, ' ') === fc.replace(/_/g, ' ')) ||
            (gc.includes('live') && fc.includes('live'));
          const isVideoMatch =
            (gc === 'video' && fc.includes('video')) ||
            (fc === 'video' && gc.includes('video'));
          return gc === fc || gc.includes(fc) || fc.includes(gc) || isLiveTvMatch || isVideoMatch;
        }).length;

        return {
          ...cat,
          image_url: meta.image_url || '',
          description: meta.description || '',
          badge_text: meta.badge_text || 'MODS & GAMES',
          game_count: count,
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
    setDescription('Magemu ya Tanzania yanapatikana kwenye hii category');
    setImageUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop');
    setBadgeText('MODS & GAMES');
    setSortOrder(String(categories.length + 1));
    setModalMode('add');
    setEditingId(null);
    setOldName('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setName(c.name || '');
    setDescription(c.description || '');
    setImageUrl(c.image_url || '');
    setBadgeText(c.badge_text || 'MODS & GAMES');
    setSortOrder(String(c.display_order ?? 0));
    setModalMode('edit');
    setEditingId(c.id);
    setOldName(c.name || '');
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'edit') {
        const { error } = await supabase
          .from('categories')
          .update({
            name,
            display_order: Number(sortOrder),
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name,
            display_order: Number(sortOrder),
            is_visible: true,
          });
        if (error) throw error;
      }

      // Load and update category_metadata JSON in store_settings
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

      const newMeta = {
        image_url: imageUrl,
        description,
        badge_text: badgeText,
      };

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
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility');
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Una uhakika unataka kufuta Category Slider ya "${catName}"?`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

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

  const isModalSquad =
    name.toLowerCase().includes('efootball') ||
    name.toLowerCase().includes('vikosi') ||
    name.toLowerCase().includes('football');

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <Layers className="w-8 h-8 text-blue-500" />
            <span>CMS: Category Sliders & Storefront Sections</span>
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Dhibiti Category Slideshows zinazoonekana kwenye ukurasa wa mbele. Panga mpangilio (Display Order), rekebisha Jina, Subtitle, na uone idadi ya games zilizopo.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-extrabold uppercase shadow-md flex items-center gap-2 shrink-0 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Ongeza Category Mpya</span>
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 font-bold uppercase text-xs animate-pulse p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          Inapakia Category Sliders...
        </div>
      ) : (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                  <th className="pb-3.5 pl-2">Display Order</th>
                  <th className="pb-3.5">Storefront Slider Header (Preview)</th>
                  <th className="pb-3.5">Michezo</th>
                  <th className="pb-3.5">Visibility</th>
                  <th className="pb-3.5 text-right pr-2">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
                {categories.map((c) => {
                  const isSquad =
                    c.name.toLowerCase().includes('efootball') ||
                    c.name.toLowerCase().includes('vikosi') ||
                    c.name.toLowerCase().includes('football');

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Display Order */}
                      <td className="py-4 pl-2 font-black text-slate-400">
                        <span className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-blue-400">
                          #{c.display_order ?? 0}
                        </span>
                      </td>

                      {/* Storefront Slider Header Preview */}
                      <td className="py-4 max-w-md">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                              isSquad ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-blue-600'
                            }`}>
                              {isSquad ? <Trophy className="w-4 h-4 text-white" /> : <Gamepad2 className="w-4 h-4 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white uppercase truncate">
                                {c.name}
                              </h4>
                              <p className="text-[10px] text-blue-400 font-bold truncate mt-0.5">
                                {c.description || `${c.game_count || 0} Michezo Inapatikana`}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-blue-600/15 border border-blue-500/30 text-blue-400 shrink-0 flex items-center gap-1">
                            Angalia Zote ({c.game_count || 0}) <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </td>

                      {/* Michezo Count Badge */}
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap bg-blue-600/10 text-blue-400 border border-blue-500/30">
                          {isSquad ? `${c.game_count || 0} Vikosi` : `${c.game_count || 0} Games`}
                        </span>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleVisible(c.id, c.is_visible)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 border transition-all cursor-pointer ${
                            c.is_visible
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {c.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{c.is_visible ? 'Inaonekana' : 'Imejificha'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors cursor-pointer"
                            title="Hariri Category"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                            title="Futa Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span>{modalMode === 'edit' ? 'Hariri Category Slider' : 'Ongeza Category Slider Mpya'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Interactive Storefront Preview Box */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                Live Storefront Preview:
              </span>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isModalSquad ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-blue-600'
                  }`}>
                    {isModalSquad ? <Trophy className="w-4 h-4 text-white" /> : <Gamepad2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase truncate">
                      {name || 'JINA LA CATEGORY'}
                    </h4>
                    <p className="text-[10px] text-blue-400 font-bold truncate mt-0.5">
                      {description || 'Magemu yanapatikana kwenye hii category'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shrink-0 flex items-center gap-1">
                  Angalia Zote ➔
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Category Name (Jina la Category)</label>
                <input
                  type="text"
                  required
                  placeholder="mfano: TANZANIA GAMES au MALEO BUS MODE TZ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">
                  Slider Subtitle / Maelezo Mafupi (Yanaonekana kwenye Header ya Slider)
                </label>
                <input
                  type="text"
                  required
                  placeholder="mfano: MAGEMU YA TANZANIA YANAPATIKANA KWENYE HII CATEGORY"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Display Order (Nafasi)</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Nambari ndogo inaanza juu</span>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Badge Tag</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1.5 text-xs">Cover Art (Picha ya Droo ya Michezo)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs truncate focus:border-blue-500 focus:outline-none"
                    placeholder="https://i.ibb.co/..."
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setImageUrl(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black uppercase tracking-wider shadow-md transition-all text-sm cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? 'Inahifadhi...' : modalMode === 'edit' ? 'Hifadhi Mabadiliko ya Slider' : 'Tengeneza Category Slider'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
