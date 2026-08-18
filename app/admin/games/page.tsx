'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Gamepad2, 
  Clock, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('5000');
  const [category, setCategory] = useState('MALEO BUS MODE TZ');
  const [accessDuration, setAccessDuration] = useState('Lifetime');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data: gData } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (gData && gData.length > 0) {
        setGames(gData);
      } else {
        const { data: pData } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (pData) setGames(pData);
      }
    } catch (err) {
      console.error('Fetch games error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleOpenAdd = () => {
    setEditingGame(null);
    setTitle('');
    setPrice('5000');
    setCategory('MALEO BUS MODE TZ');
    setAccessDuration('Lifetime');
    setDescription('');
    setCoverImage('https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg');
    setDownloadUrl('');
    setStatus('published');
    setModalOpen(true);
  };

  const handleOpenEdit = (game: any) => {
    setEditingGame(game);
    setTitle(game.title || '');
    setPrice(String(game.price ?? 0));
    setCategory(game.category || 'MALEO BUS MODE TZ');
    setAccessDuration(game.access_duration || game.license_duration || 'Lifetime');
    setDescription(game.description || '');
    setCoverImage(game.cover_image || game.image_url || '');
    
    // Resolve download URL
    let dUrl = game.download_url || '';
    if (!dUrl && Array.isArray(game.download_links) && game.download_links.length > 0) {
      dUrl = game.download_links[0].url || '';
    }
    setDownloadUrl(dUrl);
    setStatus(game.status || 'published');
    setModalOpen(true);
  };

  const handleToggleStatus = async (game: any) => {
    const nextStatus = game.status === 'published' ? 'draft' : 'published';
    setActionLoadingId(game.id);
    try {
      const res = await fetch('/api/admin/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update visibility');
      }

      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, status: nextStatus } : g))
      );
    } catch (err: any) {
      alert(err.message || 'Error toggling status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        price: Number(price),
        category: category.trim(),
        access_duration: accessDuration,
        license_duration: accessDuration,
        description: description.trim(),
        cover_image: coverImage.trim(),
        download_url: downloadUrl.trim(),
        status,
      };

      const isEdit = !!editingGame?.id;
      const method = isEdit ? 'PUT' : 'POST';
      if (isEdit) {
        payload.id = editingGame.id;
      }

      const res = await fetch('/api/admin/games', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product');
      }

      setModalOpen(false);
      fetchGames();
    } catch (err: any) {
      alert(err.message || 'Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) return;
    try {
      await fetch(`/api/admin/games?id=${id}`, { method: 'DELETE' });
      fetchGames();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const formatBadgeDuration = (dur?: string) => {
    if (!dur) return '♾️ Lifetime';
    const l = dur.toLowerCase();
    if (l.includes('lifetime') || l.includes('maisha')) return '♾️ Lifetime';
    if (l.includes('30') || l.includes('month') || l.includes('mwezi')) return '⏳ 30 Days';
    if (l.includes('7') || l.includes('week') || l.includes('wiki')) return '⏳ 7 Days';
    if (l.includes('24') || l.includes('day') || l.includes('siku')) return '⏳ 24 Hours';
    if (l.includes('2')) return '⏳ 2 Hours';
    return `⏳ ${dur}`;
  };

  const categoriesAvailable = Array.from(
    new Set(games.map((g) => g.category).filter(Boolean))
  );

  const filtered = games.filter((g) => {
    const matchesSearch =
      (g.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || (g.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-brand-glow text-emerald-400" />
            <span>Game &amp; Mod Catalog Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create new products, edit pricing &amp; duration plans, toggle live visibility, and manage direct downloads.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Filter catalog by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="ALL">All Categories ({games.length})</option>
          {categoriesAvailable.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* ── Catalog Table ── */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider text-[11px]">
                <th className="pb-3.5">Cover Art</th>
                <th className="pb-3.5">Title</th>
                <th className="pb-3.5">Category</th>
                <th className="pb-3.5">Plan Duration</th>
                <th className="pb-3.5">Price</th>
                <th className="pb-3.5 text-center">Status</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-bold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading products catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-bold">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => {
                  const isLive = g.status === 'published' || !g.status;
                  const isActionLoading = actionLoadingId === g.id;

                  return (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3">
                        <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                          <Image
                            src={g.cover_image || g.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
                            alt={g.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-3 font-bold text-white max-w-xs truncate pr-4">
                        {g.title}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-teal-300 border border-slate-700 text-[10px] font-extrabold uppercase">
                          {g.category}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
                          {formatBadgeDuration(g.access_duration || g.license_duration)}
                        </span>
                      </td>
                      <td className="py-3 font-extrabold text-emerald-400 text-sm">
                        {g.price === 0 ? 'FREE' : formatCurrency(g.price)}
                      </td>
                      
                      {/* Active / Inactive Visibility Toggle */}
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(g)}
                          disabled={isActionLoading}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                            isLive
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          }`}
                          title={isLive ? 'Product is Live on Storefront (Click to Hide)' : 'Product is Hidden Draft (Click to Publish)'}
                        >
                          {isLive ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-400" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(g)}
                            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors cursor-pointer"
                            title="Edit Product Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteGame(g.id)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Product Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {editingGame ? 'Edit Product / Game Mod' : 'Add Product / Game Mod'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHABIBY YUTONG LUXURY BUS MODE"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                    Price (TZS)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="MALEO BUS MODE TZ">MALEO BUS MODE TZ</option>
                    <option value="MALEO MAP MODE TZ">MALEO MAP MODE TZ</option>
                    <option value="TANZANIA GAMES">TANZANIA GAMES</option>
                    <option value="PC Games">PC Games</option>
                    <option value="PS2 GAMES KWENYE SIMU">PS2 GAMES KWENYE SIMU</option>
                    <option value="FOOTBALL GAMES">FOOTBALL GAMES</option>
                    <option value="MALEO BUS SKIN">MALEO BUS SKIN</option>
                    <option value="Mods">Mods</option>
                    <option value="Action">Action</option>
                    <option value="Racing">Racing</option>
                  </select>
                </div>
              </div>

              {/* Plan Duration Selector */}
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Plan Duration (Muda wa Ufikiaji)</span>
                </label>
                <select
                  value={accessDuration}
                  onChange={(e) => setAccessDuration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Lifetime">♾️ Lifetime Access (Ufikiaji wa Maisha)</option>
                  <option value="30 Days">⏳ 30 Days (Siku 30 / Mwezi 1)</option>
                  <option value="7 Days">⏳ 7 Days (Siku 7 / Wiki 1)</option>
                  <option value="24 Hours">⏳ 24 Hours (Masaa 24 / Siku 1)</option>
                  <option value="2 Hours">⏳ 2 Hours (Masaa 2)</option>
                </select>
              </div>

              {/* Status Visibility Selector */}
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                  Storefront Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`py-2.5 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      status === 'published'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Active (Live)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`py-2.5 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      status !== 'published'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span>Draft (Hidden)</span>
                  </button>
                </div>
              </div>

              {/* ImgBB Cover Art */}
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                  Direct ImgBB Cover Art URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://i.ibb.co/..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs truncate focus:outline-none focus:border-emerald-500"
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setCoverImage(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              {/* Digital File Download Link */}
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                  Digital File Download Link
                </label>
                <input
                  type="url"
                  placeholder="https://www.mediafire.com/file/... or Google Drive"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1 tracking-wider text-[11px]">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Product description and installation details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-wider text-xs cursor-pointer"
              >
                {submitting
                  ? (editingGame ? 'Saving Changes...' : 'Publishing Product...')
                  : (editingGame ? 'Save Changes' : 'Publish Product to Catalog')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
