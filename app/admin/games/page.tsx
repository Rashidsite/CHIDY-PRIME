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
  Video, 
  Download, 
  FileText, 
  Star, 
  CheckCircle2, 
  Info,
  Link as LinkIcon,
  ChevronRight,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface DownloadLinkItem {
  name: string;
  url: string;
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'content'>('basic');

  // Form State - Tab 1 Basic
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('5000');
  const [category, setCategory] = useState('MALEO BUS MODE TZ');
  const [customCategory, setCustomCategory] = useState('');
  const [rating, setRating] = useState('4.8');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');
  
  // Form State - Tab 2 Media & Multi-Links
  const [coverImage, setCoverImage] = useState('');
  const [downloadLinks, setDownloadLinks] = useState<DownloadLinkItem[]>([
    { name: 'Download Game APK', url: '' },
  ]);
  const [videoUrl, setVideoUrl] = useState('');

  // Form State - Tab 3 Duration & Content
  const [accessDuration, setAccessDuration] = useState('Lifetime');
  const [description, setDescription] = useState('');
  const [installGuide, setInstallGuide] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/games');
      const data = await res.json();
      if (data.success && Array.isArray(data.games)) {
        setGames(data.games);
      } else {
        // Fallback directly to posts table
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (postsData) {
          setGames(postsData.map((p) => ({
            ...p,
            cover_image: p.image_url,
            access_duration: p.duration_days === 30 ? '30 Days' : p.duration_days === 7 ? '7 Days' : p.duration_days === 1 ? '24 Hours' : 'Lifetime',
          })));
        }
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

  // Lock body scroll when modal is active to prevent background scrolling
  useEffect(() => {
    if (modalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [modalOpen]);

  const handleOpenAdd = () => {
    setEditingGame(null);
    setTitle('');
    setPrice('5000');
    setCategory('MALEO BUS MODE TZ');
    setCustomCategory('');
    setRating('4.8');
    setStatus('published');
    setCoverImage('https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg');
    setDownloadLinks([
      { name: 'Download Game / Mod', url: '' },
    ]);
    setVideoUrl('');
    setAccessDuration('Lifetime');
    setDescription('');
    setInstallGuide('');
    setActiveTab('basic');
    setModalOpen(true);
  };

  const handleOpenEdit = (game: any) => {
    setEditingGame(game);
    setTitle(game.title || '');
    setPrice(String(game.price ?? 0));
    
    const cat = game.category || 'MALEO BUS MODE TZ';
    setCategory(cat);
    setCustomCategory('');
    
    setRating(String(game.rating || 4.8));
    setStatus(game.status || 'published');
    setCoverImage(game.cover_image || game.image_url || '');

    // Parse links
    let parsedLinks: DownloadLinkItem[] = [];
    if (Array.isArray(game.links) && game.links.length > 0) {
      parsedLinks = game.links.map((l: any) => ({
        name: l.name || l.label || 'Download File',
        url: l.url || '',
      }));
    } else if (Array.isArray(game.download_links) && game.download_links.length > 0) {
      parsedLinks = game.download_links.map((l: any) => ({
        name: l.name || l.label || 'Download File',
        url: l.url || '',
      }));
    } else if (game.download_url) {
      parsedLinks = [{ name: 'Download Game / Mod', url: game.download_url }];
    } else {
      parsedLinks = [{ name: 'Download Game / Mod', url: '' }];
    }

    setDownloadLinks(parsedLinks);
    setVideoUrl(game.youtube_url || game.video_url || '');

    // Resolve plan duration
    let dur = game.access_duration || game.license_duration;
    if (!dur && game.duration_days !== undefined) {
      dur = game.duration_days === 30 ? '30 Days' : game.duration_days === 7 ? '7 Days' : game.duration_days === 1 ? '24 Hours' : 'Lifetime';
    }
    setAccessDuration(dur || 'Lifetime');
    setDescription(game.description || '');
    setInstallGuide(game.install_guide || game.installation_steps || '');
    
    setActiveTab('basic');
    setModalOpen(true);
  };

  // Multi-Link helper actions
  const handleAddLinkRow = (presetName = 'Download File') => {
    setDownloadLinks((prev) => [...prev, { name: presetName, url: '' }]);
  };

  const handleRemoveLinkRow = (index: number) => {
    if (downloadLinks.length <= 1) {
      setDownloadLinks([{ name: 'Download File', url: '' }]);
      return;
    }
    setDownloadLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLinkRow = (index: number, field: 'name' | 'url', value: string) => {
    setDownloadLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
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
      const finalCategory = (category === 'CUSTOM' && customCategory.trim()) 
        ? customCategory.trim() 
        : category.trim();

      // Clean links
      const cleanLinks = downloadLinks
        .filter((l) => l.url && l.url.trim())
        .map((l) => ({
          name: l.name.trim() || 'Download File',
          url: l.url.trim(),
        }));

      const payload: Record<string, any> = {
        title: title.trim(),
        price: Number(price),
        category: finalCategory,
        rating: Number(rating) || 4.8,
        access_duration: accessDuration,
        license_duration: accessDuration,
        description: description.trim(),
        install_guide: installGuide.trim(),
        cover_image: coverImage.trim(),
        image_url: coverImage.trim(),
        download_url: cleanLinks[0]?.url || '',
        links: cleanLinks,
        video_url: videoUrl.trim(),
        youtube_url: videoUrl.trim(),
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

  const formatBadgeDuration = (dur?: string, days?: number) => {
    if (dur) {
      const l = dur.toLowerCase();
      if (l.includes('lifetime') || l.includes('maisha')) return '♾️ Lifetime';
      if (l.includes('30') || l.includes('month') || l.includes('mwezi')) return '⏳ 30 Days';
      if (l.includes('7') || l.includes('week') || l.includes('wiki')) return '⏳ 7 Days';
      if (l.includes('24') || l.includes('day') || l.includes('siku')) return '⏳ 24 Hours';
      if (l.includes('2')) return '⏳ 2 Hours';
      return `⏳ ${dur}`;
    }
    if (days !== undefined) {
      if (days === 30) return '⏳ 30 Days';
      if (days === 7) return '⏳ 7 Days';
      if (days === 1) return '⏳ 24 Hours';
    }
    return '♾️ Lifetime';
  };

  const PRESET_CATEGORIES = [
    'MALEO BUS MODE TZ',
    'MALEO MAP MODE TZ',
    'TANZANIA GAMES',
    'PC Games',
    'PS2 GAMES KWENYE SIMU',
    'FOOTBALL GAMES',
    'MALEO BUS SKIN',
    'Mods',
    'Action',
    'Racing',
    'WORLD GAMES',
    'FAVORITE GAMES',
  ];

  const categoriesAvailable = Array.from(
    new Set([...PRESET_CATEGORIES, ...games.map((g) => g.category).filter(Boolean)])
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
    <div className="space-y-8 max-w-7xl">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-emerald-400" />
            <span>Game &amp; Mod Catalog Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your catalog with dynamic Multi-Link download buttons, plan durations, ImgBB artwork previews, and live storefront visibility.
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
                <th className="pb-3.5">Download Buttons</th>
                <th className="pb-3.5">Plan Duration</th>
                <th className="pb-3.5">Price</th>
                <th className="pb-3.5 text-center">Status</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-bold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading products catalog from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-bold">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => {
                  const isLive = g.status === 'published' || !g.status;
                  const isActionLoading = actionLoadingId === g.id;
                  const linkCount = Array.isArray(g.links) ? g.links.length : (g.download_url ? 1 : 0);

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
                      <td className="py-3 font-bold text-white max-w-xs truncate pr-3">
                        {g.title}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-teal-300 border border-slate-700 text-[10px] font-extrabold uppercase">
                          {g.category}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                          {linkCount > 1 ? `🔗 ${linkCount} Buttons` : linkCount === 1 ? '🔗 1 Direct Link' : '⚠️ No Link'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
                          {formatBadgeDuration(g.access_duration || g.license_duration, g.duration_days)}
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

      {/* ── PROFESSIONAL MULTI-TAB PRODUCT MODAL ── */}
      {modalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[6px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] space-y-6 max-h-[92vh] flex flex-col justify-between overscroll-contain">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow">
                  {editingGame ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {editingGame ? 'Edit Product / Game Mod' : 'Add New Product to Catalog'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {editingGame ? `Editing ID: ${editingGame.id}` : 'Fill out details across all 3 sections to publish.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3-Section Tab Navigation */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'basic'
                    ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">1.</span> Basic Info
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'media'
                    ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2.</span> Media &amp; Access ({downloadLinks.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'content'
                    ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">3.</span> Duration &amp; Content
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveGame} id="productForm" className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              
              {/* ═══════════════════════════════════════════════════════════════
                  TAB 1: BASIC INFO
              ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'basic' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SHABIBY YUTONG LUXURY BUS MODE"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-black uppercase text-slate-300 tracking-wider text-[11px]">
                          Price (TZS) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setPrice(price === '0' ? '5000' : '0')}
                          className="text-[10px] font-black text-emerald-400 hover:underline uppercase cursor-pointer"
                        >
                          {price === '0' ? 'Set Standard (5,000)' : 'Make Free (0 TZS)'}
                        </button>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {PRESET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="CUSTOM">+ Custom Category Name...</option>
                      </select>
                    </div>
                  </div>

                  {category === 'CUSTOM' && (
                    <div>
                      <label className="block font-black uppercase text-teal-400 mb-1.5 tracking-wider text-[11px]">
                        Enter Custom Category Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. PPSSPP ANDROID MODS"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-teal-500/50 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                        Product Rating (1.0 - 5.0)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
                        />
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                        Storefront Visibility
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStatus('published')}
                          className={`py-2.5 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            status === 'published'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Active</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStatus('draft')}
                          className={`py-2.5 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            status !== 'published'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                          <span>Draft</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  TAB 2: MEDIA & DYNAMIC MULTI-LINK MANAGEMENT
              ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'media' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Cover Art Input & Live Thumbnail Preview */}
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                      Cover Art ImgBB URL *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="https://i.ibb.co/..."
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 truncate"
                      />
                      <ImgBBUploadModal
                        onUploadSuccess={(url) => setCoverImage(url)}
                        buttonLabel="Upload ImgBB"
                      />
                    </div>

                    {/* Image Preview Box */}
                    {coverImage && (
                      <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                          <Image
                            src={coverImage}
                            alt="Cover Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                            ✓ Cover Art Validated
                          </span>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs font-mono mt-0.5">
                            {coverImage}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Multi-Link Download Buttons Section */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-black uppercase text-white tracking-wider text-xs flex items-center gap-1.5">
                          <Download className="w-4 h-4 text-blue-400" />
                          <span>Dynamic Download Action Buttons</span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Each row below creates an explicit download button on the customer's unlocked screen.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddLinkRow('Download File')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Link Row</span>
                      </button>
                    </div>

                    {/* Preset Link Fast Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Add:</span>
                      {['Download APK', 'Download OBB File', 'Download Mod Data', 'Download Save Data', 'MediaFire Direct'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddLinkRow(preset)}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[9px] font-bold cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    {/* Link Rows */}
                    <div className="space-y-3 pt-2">
                      {downloadLinks.map((linkItem, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                            <span>Button #{idx + 1}</span>
                            {downloadLinks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLinkRow(idx)}
                                className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                Button Name / Label
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Download APK"
                                value={linkItem.name}
                                onChange={(e) => handleUpdateLinkRow(idx, 'name', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                Download URL (MediaFire, Google Drive, Mega)
                              </label>
                              <input
                                type="url"
                                required
                                placeholder="https://www.mediafire.com/file/..."
                                value={linkItem.url}
                                onChange={(e) => handleUpdateLinkRow(idx, 'url', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-blue-300 font-mono text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video / Demo Link */}
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px] flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-purple-400" />
                      <span>Video Demo / Gameplay Trailer Link (Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or .mp4 URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  TAB 3: PLAN DURATION & CONTENT
              ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'content' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Plan Duration Selector */}
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Plan Duration (Muda wa Ufikiaji) *</span>
                    </label>
                    <select
                      value={accessDuration}
                      onChange={(e) => setAccessDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-500 cursor-pointer text-sm"
                    >
                      <option value="Lifetime">♾️ Lifetime Access (Ufikiaji wa Maisha)</option>
                      <option value="30 Days">⏳ 30 Days (Siku 30 / Mwezi 1)</option>
                      <option value="7 Days">⏳ 7 Days (Siku 7 / Wiki 1)</option>
                      <option value="24 Hours">⏳ 24 Hours (Masaa 24 / Siku 1)</option>
                      <option value="2 Hours">⏳ 2 Hours (Masaa 2)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      This label renders dynamically on storefront badges (e.g. ⏳ 7 DAYS ACCESS).
                    </p>
                  </div>

                  {/* Rich Description */}
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px]">
                      Product Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="High performance mod with custom sound engine and realistic physics..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Installation Guide */}
                  <div>
                    <label className="block font-black uppercase text-slate-300 mb-1.5 tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span>Installation Steps / Guide (Maelekezo ya Kuset)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="1. Pakua faili kisha extract zip\n2. Weka kwenye folder la BUSSID/Mods\n3. Fungua game kisha play!"
                      value={installGuide}
                      onChange={(e) => setInstallGuide(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

            </form>

            {/* Modal Bottom Footer Actions */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {activeTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'content' ? 'media' : 'basic')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Previous Step
                  </button>
                )}
                {activeTab !== 'content' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'basic' ? 'media' : 'content')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-emerald-400 font-bold text-xs hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                form="productForm"
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black hover:opacity-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-wider text-xs cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? (editingGame ? 'Saving Changes...' : 'Publishing Product...')
                    : (editingGame ? 'Save Changes' : 'Publish Product to Catalog')}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
