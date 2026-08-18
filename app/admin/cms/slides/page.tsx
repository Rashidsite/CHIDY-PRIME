'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { Plus, Trash2, Sliders, Eye, EyeOff, Save, X, Edit3, ArrowUp, ArrowDown, Sparkles, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const parseSlideMedia = (rawUrl: string) => {
  try {
    if (rawUrl && rawUrl.startsWith('{')) {
      const parsed = JSON.parse(rawUrl);
      return {
        image: parsed.image || '',
        video: parsed.video || '',
        type: parsed.type || 'video',
      };
    }
  } catch (e) {}
  return {
    image: rawUrl || '',
    video: '',
    type: 'image',
  };
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = (url || '').match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

export default function AdminCmsSlidesPage() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States (Add / Edit / Delete Confirmation)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [tag, setTag] = useState('CHIDY PRIME EXCLUSIVE');
  const [ctaText, setCtaText] = useState('EXPLORE NOW');
  const [ctaLink, setCtaLink] = useState('#catalog');
  const [sortOrder, setSortOrder] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/slides');
      const data = await res.json();
      if (data.success && Array.isArray(data.slides)) {
        const sorted = [...data.slides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setSlides(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch slides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openAddModal = () => {
    setEditingSlideId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop');
    setTag('CHIDY PRIME EXCLUSIVE');
    setCtaText('EXPLORE NOW');
    setCtaLink('#catalog');
    setSortOrder(String(slides.length + 1));
    setMediaType('image');
    setVideoUrl('');
    setModalOpen(true);
  };

  const openEditModal = (slide: any) => {
    setEditingSlideId(slide.id);
    setTitle(slide.title || '');
    setSubtitle(slide.subtitle || '');
    const media = parseSlideMedia(slide.image_url);
    setImageUrl(media.image || slide.image_url || '');
    setMediaType(media.type as any || 'image');
    setVideoUrl(media.video || '');
    setTag(slide.tag || 'CHIDY PRIME EXCLUSIVE');
    setCtaText(slide.cta_text || 'EXPLORE NOW');
    setCtaLink(slide.cta_link || '#catalog');
    setSortOrder(String(slide.sort_order || 0));
    setModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      if (mediaType === 'video' && videoUrl.trim()) {
        finalImageUrl = JSON.stringify({
          image: imageUrl,
          video: videoUrl.trim(),
          type: 'video',
        });
      }

      const method = editingSlideId ? 'PATCH' : 'POST';
      const payload: any = {
        title,
        subtitle,
        image_url: finalImageUrl,
        tag,
        cta_text: ctaText,
        cta_link: ctaLink,
        sort_order: Number(sortOrder),
        is_active: true,
      };

      if (editingSlideId) {
        payload.id = editingSlideId;
      }

      const res = await fetch('/api/admin/cms/slides', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save slide');

      setModalOpen(false);
      fetchSlides();
    } catch (err: any) {
      alert(err.message || 'Error saving slide');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    // Optimistic state update
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
    );

    try {
      await fetch('/api/admin/cms/slides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
    } catch (err) {
      fetchSlides();
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    // Re-assign sort orders
    const updatedWithSort = newSlides.map((item, i) => ({
      ...item,
      sort_order: i + 1,
    }));

    setSlides(updatedWithSort);

    // Sync changes to backend
    try {
      await Promise.all(
        updatedWithSort.map((s) =>
          fetch('/api/admin/cms/slides', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: s.id, sort_order: s.sort_order }),
          })
        )
      );
    } catch (e) {
      fetchSlides();
    }
  };

  const confirmDeleteSlide = async () => {
    if (!deleteTargetId) return;
    try {
      await fetch(`/api/admin/cms/slides?id=${deleteTargetId}`, { method: 'DELETE' });
      setDeleteTargetId(null);
      fetchSlides();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <Sliders className="w-8 h-8 text-blue-500" />
            <span>CMS: Hero Slideshow Suite</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
            Manage storefront hero banners with full Edit, Reorder priority, Visibility toggle, and Live HD Image Preview.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 shrink-0 touch-manipulation cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Hero Banner</span>
        </button>
      </div>

      {/* Hero Banners Table Section */}
      <div className="p-6 rounded-3xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[11px]">
                <th className="pb-4">Priority</th>
                <th className="pb-4">Banner Preview</th>
                <th className="pb-4">Title & Subtitle</th>
                <th className="pb-4">Tag & CTA Link</th>
                <th className="pb-4">Visibility</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {loading ? (
                // Table Skeleton Loader
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-5"><div className="w-8 h-8 bg-slate-800 rounded-xl" /></td>
                    <td className="py-5"><div className="w-28 h-16 bg-slate-800 rounded-xl" /></td>
                    <td className="py-5"><div className="w-48 h-10 bg-slate-800 rounded-xl" /></td>
                    <td className="py-5"><div className="w-32 h-8 bg-slate-800 rounded-xl" /></td>
                    <td className="py-5"><div className="w-20 h-7 bg-slate-800 rounded-xl" /></td>
                    <td className="py-5 text-right"><div className="w-24 h-8 bg-slate-800 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : slides.length > 0 ? (
                slides.map((s, idx) => {
                  const mediaInfo = parseSlideMedia(s.image_url);
                  const isFirst = idx === 0;
                  const isLast = idx === slides.length - 1;

                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      {/* Priority & Reorder Controls */}
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <span className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-xs text-blue-400">
                            #{idx + 1}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={isFirst}
                              onClick={() => handleMoveOrder(idx, 'up')}
                              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-blue-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation"
                              title="Move Banner Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={isLast}
                              onClick={() => handleMoveOrder(idx, 'down')}
                              className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-blue-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation"
                              title="Move Banner Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Banner Image / Media Preview */}
                      <td className="py-4">
                        <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                          {mediaInfo.type === 'video' ? (
                            <div className="text-[10px] text-blue-400 font-black uppercase p-1 text-center bg-slate-950 w-full h-full flex items-center justify-center gap-1">
                              <Play className="w-3 h-3 text-blue-400" />
                              <span>Video Banner</span>
                            </div>
                          ) : (
                            mediaInfo.image && (
                              <Image
                                src={mediaInfo.image}
                                alt={s.title}
                                fill
                                quality={90}
                                unoptimized={Boolean(mediaInfo.image.includes('ibb.co'))}
                                placeholder="blur"
                                blurDataURL={BLUR_DATA_URL}
                                className="object-cover"
                              />
                            )
                          )}
                        </div>
                      </td>

                      {/* Title & Subtitle */}
                      <td className="py-4 max-w-xs">
                        <span className="font-black text-white block truncate text-sm uppercase">{s.title}</span>
                        <span className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">{s.subtitle}</span>
                      </td>

                      {/* Tag & CTA */}
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/30 font-black text-[10px] uppercase block w-fit mb-1">
                          {s.tag}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                          CTA: {s.cta_text || 'EXPLORE'} ({s.cta_link})
                        </span>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleActive(s.id, s.is_active)}
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation ${
                            s.is_active
                              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {s.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{s.is_active ? 'ACTIVE' : 'HIDDEN'}</span>
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer touch-manipulation"
                            title="Edit Hero Banner"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(s.id)}
                            className="p-2 rounded-xl bg-rose-600/10 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer touch-manipulation"
                            title="Delete Hero Banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                    No hero banners configured yet. Click "Add New Hero Banner" to create one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD / EDIT HERO BANNER MODAL WITH LIVE HD PREVIEW ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                {editingSlideId ? '✏️ Edit Hero Banner' : '➕ Add Hero Banner'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Image / Video HD Preview Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                LIVE BANNER PREVIEW
              </label>
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                {mediaType === 'video' && videoUrl.trim() ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}?autoplay=0&controls=1`}
                    title="Live Preview"
                    className="w-full h-full object-cover border-0"
                  />
                ) : imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    quality={90}
                    unoptimized={Boolean(imageUrl.includes('ibb.co'))}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-500 uppercase">No Image Selected</span>
                )}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-blue-600 text-white font-black text-[10px] uppercase shadow-md">
                  {tag || 'EXCLUSIVE'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSlide} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block font-black uppercase text-slate-300 mb-1.5">BANNER TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MALEO BUS MODS TZ — SHABIBY EDITION"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-slate-300 mb-1.5">SUBTITLE / DESCRIPTION</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bus mods za Tanzanian routes, authentic sound engine & interiors."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-slate-300 mb-1.5">MEDIA TYPE (AINA YA MAUDHUI)</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="image">Image (Picha pekee)</option>
                  <option value="video">Video (YouTube Direct Embed)</option>
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-slate-300 mb-1.5">
                  BANNER IMAGE URL (IMGBB HOSTED)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    required={mediaType === 'image'}
                    placeholder="https://i.ibb.co/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setImageUrl(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              {mediaType === 'video' && (
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1.5">YOUTUBE VIDEO URL</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1.5">BADGE TAG</label>
                  <input
                    type="text"
                    placeholder="CHIDY PRIME EXCLUSIVE"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1.5">CTA BUTTON TEXT</label>
                  <input
                    type="text"
                    placeholder="EXPLORE NOW"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1.5">TARGET LINK</label>
                  <input
                    type="text"
                    placeholder="#catalog"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-black uppercase text-slate-300 mb-1.5">DISPLAY PRIORITY ORDER</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>HIFADHI BANNER...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingSlideId ? 'HIFADHI MABADILIKO' : 'ONGEZA BANNER MPYA'}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-white uppercase tracking-tight">KUFUTA HERO BANNER</h4>
              <p className="text-xs text-slate-300 font-bold mt-1.5">
                Una uhakika unataka kufuta banner hii kutoka kwenye slideshow?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={confirmDeleteSlide}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer touch-manipulation"
              >
                Ndio, Futa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
