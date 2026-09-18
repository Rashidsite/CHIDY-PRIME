'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Flame, 
  Save, 
  Search, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sliders, 
  Gamepad2, 
  Star, 
  Check, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface TrendingConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  mode: 'manual' | 'auto';
  game_ids: string[];
  max_items: number;
}

const DEFAULT_CONFIG: TrendingConfig = {
  enabled: true,
  title: '🔥 Hot & Trending Games',
  subtitle: 'Michezo inayopendwa zaidi sasa hivi',
  mode: 'manual',
  game_ids: [],
  max_items: 8,
};

export default function AdminTrendingPage() {
  const [config, setConfig] = useState<TrendingConfig>(DEFAULT_CONFIG);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search and Category filter for adding games
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const supabase = useMemo(() => createClient(), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Games Catalog & Current Trending Settings
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all games
      const resGames = await fetch('/api/admin/games');
      const dataGames = await resGames.json();
      let allGamesList: any[] = [];

      if (dataGames.success && Array.isArray(dataGames.games)) {
        allGamesList = dataGames.games;
      } else {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (postsData) {
          allGamesList = postsData.map((p) => ({
            ...p,
            cover_image: p.image_url || p.cover_image,
          }));
        }
      }
      setGames(allGamesList);

      // Fetch Trending Config
      const resSettings = await fetch('/api/admin/settings');
      const dataSettings = await resSettings.json();

      let currentVal = dataSettings?.settings?.trending_games;
      if (!currentVal) {
        const { data: directData } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'trending_games')
          .maybeSingle();
        if (directData?.value) {
          currentVal = directData.value;
        }
      }

      if (Array.isArray(currentVal)) {
        setConfig({
          ...DEFAULT_CONFIG,
          game_ids: currentVal,
        });
      } else if (typeof currentVal === 'object' && currentVal !== null) {
        setConfig({
          enabled: currentVal.enabled !== false,
          title: currentVal.title || DEFAULT_CONFIG.title,
          subtitle: currentVal.subtitle || DEFAULT_CONFIG.subtitle,
          mode: currentVal.mode || 'manual',
          game_ids: Array.isArray(currentVal.game_ids) ? currentVal.game_ids : [],
          max_items: Number(currentVal.max_items) || 8,
        });
      }
    } catch (err) {
      console.error('Failed to load trending data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Save Trending Configuration to API
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'trending_games',
          value: config,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('⚡ Mabadiliko ya Hot & Trending yamehifadhiwa na kurushwa live!');
      } else {
        showToast('❌ Hitilafu ya kuhifadhi: ' + (data.error || 'Jaribu tena'));
      }
    } catch (err: any) {
      showToast('❌ Hitilafu ya mtandao: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reorder games in trending list
  const moveGame = (index: number, direction: 'up' | 'down') => {
    const newIds = [...config.game_ids];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;

    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;

    setConfig((prev) => ({
      ...prev,
      game_ids: newIds,
    }));
  };

  // Remove game from trending
  const removeGame = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      game_ids: prev.game_ids.filter((gId) => gId !== id),
    }));
  };

  // Add game to trending
  const addGame = (id: string) => {
    if (config.game_ids.includes(id)) return;
    setConfig((prev) => ({
      ...prev,
      game_ids: [...prev.game_ids, id],
    }));
  };

  // List of active selected game objects in exact trending order
  const selectedGames = useMemo(() => {
    return config.game_ids
      .map((id) => games.find((g) => g.id === id))
      .filter(Boolean);
  }, [config.game_ids, games]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [games]);

  // Filtered catalog games to add
  const filteredCatalog = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch = 
        (g.title || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (g.category || '').toLowerCase().includes(catalogSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [games, catalogSearch, selectedCategory]);

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-2xl border border-blue-400 animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-orange-950/40 via-blue-950/40 to-slate-900 border border-orange-500/30 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <Flame className="w-8 h-8 text-white fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Storefront Featured Section
              </span>
              <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
              Usimamizi wa Hot & Trending Games
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Chagua, panga, na udhibiti michezo inayoonekana kwenye sehemu ya juu ya 🔥 Hot & Trending Games kwenye Homepage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all min-h-[44px] cursor-pointer touch-manipulation"
            title="Tazama Storefront Live"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <span>Tazama Live</span>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all min-h-[44px] cursor-pointer touch-manipulation disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Inahifadhi...' : 'Hifadhi Mabadiliko'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hali ya Sehemu</span>
          <div className="text-lg font-black mt-1 flex items-center gap-2">
            <span className={config.enabled ? 'text-emerald-400' : 'text-rose-400'}>
              {config.enabled ? 'INAWAKA (ACTIVE)' : 'IMEZIMWA (OFF)'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aina ya Mpangilio</span>
          <div className="text-lg font-black text-amber-400 mt-1">
            {config.mode === 'manual' ? '🎯 Manual Curation' : '⭐ Auto Top Rating'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Michezo Iliyochaguliwa</span>
          <div className="text-2xl font-black text-white mt-1">
            {selectedGames.length} <span className="text-xs text-slate-400 font-bold">/ {config.max_items}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumla ya Katalogi</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{games.length} Games</div>
        </div>
      </div>

      {/* Section 1: General Settings Controls Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              1. Mipangilio ya Sehemu ya Hot & Trending
            </h3>
          </div>

          {/* Toggle Switch */}
          <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
            <span className="text-xs font-black uppercase text-slate-300">
              {config.enabled ? 'Washa Sehemu' : 'Zima Sehemu'}
            </span>
            <div 
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                config.enabled ? 'bg-orange-600' : 'bg-slate-800'
              }`}
            >
              <div 
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-0'
                }`} 
              />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Kichwa cha Sehemu (Section Title)
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Mfano: 🔥 Hot & Trending Games"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Maelezo Mafupi (Subtitle)
            </label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Mfano: Michezo inayopendwa zaidi sasa hivi"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Mfumo wa Uchaguzi (Selection Mode)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'manual' }))}
                className={`p-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[44px] ${
                  config.mode === 'manual'
                    ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>🎯 Chagua Maalum</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'auto' }))}
                className={`p-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[44px] ${
                  config.mode === 'auto'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>⭐ Kiotomatiki (Rating)</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {config.mode === 'manual' 
                ? 'Wewe ndiye unayechagua kila game na mpangilio wake maalum.' 
                : 'Mfumo utaweka kiotomatiki game zenye nyota na rating ya juu zaidi.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
              Idadi ya Juu ya Michezo (Max Items Limit)
            </label>
            <select
              value={config.max_items}
              onChange={(e) => setConfig((prev) => ({ ...prev, max_items: Number(e.target.value) }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value={4}>Michezo 4</option>
              <option value={6}>Michezo 6</option>
              <option value={8}>Michezo 8 (Kawaida)</option>
              <option value={10}>Michezo 10</option>
              <option value={12}>Michezo 12</option>
              <option value={16}>Michezo 16</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Active Trending Carousel List (Reorder & Remove) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                2. Michezo Iliyopo Kwenye Trending Hivi Sasa ({selectedGames.length})
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Panga au ondoa michezo kwa kutumia vitufe vya mishale (↑ / ↓).
              </p>
            </div>
          </div>

          {selectedGames.length > 0 && (
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, game_ids: [] }))}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider transition-colors self-start sm:self-auto min-h-[36px] cursor-pointer touch-manipulation"
            >
              Futa Zote (Clear All)
            </button>
          )}
        </div>

        {selectedGames.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 space-y-3">
            <Flame className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">
              Bado hujaongeza game yoyote kwenye Trending. Chagua game kutoka kwenye orodha iliyo chini hapa!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {selectedGames.map((game, idx) => (
              <div
                key={game.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/40 transition-all gap-3"
              >
                {/* Number Rank & Image */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-black text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>

                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                    {game.cover_image ? (
                      <Image
                        src={game.cover_image}
                        alt={game.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <Gamepad2 className="w-6 h-6 text-slate-600 m-auto" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase text-blue-400 block truncate">
                      {game.category}
                    </span>
                    <h4 className="text-xs font-black text-white truncate">
                      {game.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-emerald-400">
                        {game.price === 0 ? 'BURE' : formatCurrency(game.price)}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {game.rating || '4.9'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Move Up, Move Down, Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveGame(idx, 'up')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer touch-manipulation"
                    title="Sogeza Juu"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === selectedGames.length - 1}
                    onClick={() => moveGame(idx, 'down')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer touch-manipulation"
                    title="Sogeza Chini"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeGame(game.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer touch-manipulation"
                    title="Ondoa kwenye Trending"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Add from Catalog Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                3. Ongeza Michezo Kutoka Kwenye Katalogi
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Tafuta au chagua game unayotaka iwekwe kwenye orodha ya Hot & Trending.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Tafuta game kwa jina..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 min-h-[36px] cursor-pointer touch-manipulation ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              Zote ({games.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 min-h-[36px] cursor-pointer touch-manipulation ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {filteredCatalog.map((game) => {
            const isAlreadyAdded = config.game_ids.includes(game.id);
            const rankIndex = config.game_ids.indexOf(game.id);

            return (
              <div
                key={game.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isAlreadyAdded
                    ? 'bg-orange-950/20 border-orange-500/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                    {game.cover_image ? (
                      <Image
                        src={game.cover_image}
                        alt={game.title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <Gamepad2 className="w-5 h-5 text-slate-600 m-auto" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-slate-400 block truncate">
                      {game.category}
                    </span>
                    <h5 className="text-xs font-black text-white truncate">
                      {game.title}
                    </h5>
                    <span className="text-[10px] font-black text-emerald-400">
                      {game.price === 0 ? 'BURE' : formatCurrency(game.price)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isAlreadyAdded ? (
                    <button
                      type="button"
                      onClick={() => removeGame(game.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-colors min-h-[36px] cursor-pointer touch-manipulation"
                      title="Bofya kuondoa"
                    >
                      <Check className="w-3 h-3 text-orange-400" />
                      <span>#{rankIndex + 1} Ipo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addGame(game.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all min-h-[36px] cursor-pointer touch-manipulation shadow-md"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ongeza</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
