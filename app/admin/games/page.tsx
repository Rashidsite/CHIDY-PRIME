'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { Plus, Trash2, Edit3, Search, Gamepad2, Upload, Sparkles, X, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('5000');
  const [category, setCategory] = useState('MALEO BUS MODE TZ');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setGames(data);
      } else {
        const { data: posts } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (posts) setGames(posts);
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
    setDescription('');
    setCoverImage('https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg');
    setDownloadUrl('');
    setModalOpen(true);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        title,
        price: Number(price),
        category,
        description,
        cover_image: coverImage,
        download_url: downloadUrl,
        status: 'published',
      };

      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save game');
      }

      setModalOpen(false);
      fetchGames();
    } catch (err: any) {
      alert(err.message || 'Error saving game');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      await fetch(`/api/admin/games?id=${id}`, { method: 'DELETE' });
      fetchGames();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const filtered = games.filter((g) =>
    (g.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-brand-glow" />
            <span>Game & Mod Catalog Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Add new products, edit pricing, update download links, and upload cover art via ImgBB.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-glow hover:scale-105 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Filter catalog by title or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      {/* Table */}
      <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Cover Art</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3">
                    <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                      <Image
                        src={g.cover_image || g.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
                        alt={g.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-3 font-bold text-white max-w-xs truncate">{g.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-accent-cyan border border-slate-700 text-[10px] font-semibold">
                      {g.category}
                    </span>
                  </td>
                  <td className="py-3 font-extrabold text-brand-glow">
                    {g.price === 0 ? 'FREE' : formatCurrency(g.price)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteGame(g.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete Product"
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

      {/* Add / Edit Game Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-glass-border rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-glass space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Product / Game Mod</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHABIBY YUTONG LUXURY BUS MODE"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Price (TZS)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold"
                  >
                    <option value="MALEO BUS MODE TZ">MALEO BUS MODE TZ</option>
                    <option value="MALEO MAP MODE TZ">MALEO MAP MODE TZ</option>
                    <option value="PC Games">PC Games</option>
                    <option value="Mods">Mods</option>
                    <option value="Action">Action</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Direct ImgBB Cover Art URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs truncate"
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setCoverImage(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Digital File Download Link</label>
                <input
                  type="url"
                  placeholder="https://www.mediafire.com/file/..."
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Product description and installation details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-500 transition-colors shadow-glow"
              >
                {submitting ? 'Saving Product...' : 'Publish Product to Catalog'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
