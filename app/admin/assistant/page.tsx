'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Bot, 
  Sparkles, 
  Video, 
  Gamepad2, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ShieldAlert, 
  Youtube, 
  MessageSquare, 
  Flame, 
  Clock,
  Loader2,
  HelpCircle,
  Film,
  Search,
  Filter,
  Layers
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FeaturedGame {
  id: string;
  title: string;
  category: string;
  price: number | string;
  cover_image: string;
  customNote?: string;
}

interface VideoVaultItem {
  id: string;
  title: string;
  youtubeUrl: string;
  keywords: string;
  instructions?: string;
}

interface AssistantConfig {
  welcome_message: string;
  general_youtube_url: string;
  max_unpaid_attempts: number;
  lockout_minutes: number;
  featured_tz_games: FeaturedGame[];
  featured_intl_games: FeaturedGame[];
  hidden_video_vault: VideoVaultItem[];
}

export default function AdminAssistantPage() {
  const [activeTab, setActiveTab] = useState<'games' | 'vault' | 'settings'>('games');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Catalog of published games for dropdown selection
  const [catalog, setCatalog] = useState<any[]>([]);

  // Config State
  const [config, setConfig] = useState<AssistantConfig>({
    welcome_message: 'Oya gamer! Karibu sana HQ ya ChidyPrime x ChidyGaming 🎮 Naitwa Chidy, nipo hapa kuhakikisha unacheza bila chenga. Niambie kaka, umekwama wapi au unahitaji mchongo gani leo?',
    general_youtube_url: 'https://www.youtube.com/@ChidyGaming',
    max_unpaid_attempts: 5,
    lockout_minutes: 60,
    featured_tz_games: [],
    featured_intl_games: [],
    hidden_video_vault: [],
  });

  // Filter / Search for catalog dropdown
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Modal / Inputs for adding Games
  const [selectedGameId, setSelectedGameId] = useState('');
  const [gameCustomNote, setGameCustomNote] = useState('');
  const [gameTargetSection, setGameTargetSection] = useState<'tz' | 'intl'>('tz');

  // Inputs for adding Hidden Video
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoKeywords, setVideoKeywords] = useState('');
  const [videoInstructions, setVideoInstructions] = useState('');

  // Fetch initial config & catalog
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/assistant-settings');
        const data = await res.json();
        if (data.success) {
          if (data.config) {
            setConfig({
              welcome_message: data.config.welcome_message || '',
              general_youtube_url: data.config.general_youtube_url || 'https://www.youtube.com/@ChidyGaming',
              max_unpaid_attempts: data.config.max_unpaid_attempts || 5,
              lockout_minutes: data.config.lockout_minutes || 60,
              featured_tz_games: Array.isArray(data.config.featured_tz_games) ? data.config.featured_tz_games : [],
              featured_intl_games: Array.isArray(data.config.featured_intl_games) ? data.config.featured_intl_games : [],
              hidden_video_vault: Array.isArray(data.config.hidden_video_vault) ? data.config.hidden_video_vault : [],
            });
          }
          if (data.catalog) {
            setCatalog(data.catalog);
          }
        }
      } catch (err) {
        console.error('Failed to load assistant settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save Config
  const handleSaveConfig = async (configToSave?: AssistantConfig) => {
    const payload = configToSave || config;
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/admin/assistant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        alert(data.error || 'Imeshindwa kuhifadhi mipangilio');
      }
    } catch (err: any) {
      alert(err.message || 'Hitilafu ya mtandao');
    } finally {
      setSaving(false);
    }
  };

  // Add Game to Priority (auto-saves immediately)
  const handleAddGame = () => {
    if (!selectedGameId) {
      alert('Tafadhali chagua game kwenye orodha!');
      return;
    }

    const found = catalog.find(g => g.id === selectedGameId);
    if (!found) return;

    const newGame: FeaturedGame = {
      id: found.id,
      title: found.title,
      category: found.category || 'Game',
      price: found.price || 3000,
      cover_image: found.cover_image || '/placeholder.png',
      customNote: gameCustomNote.trim() || undefined,
    };

    let updatedConfig: AssistantConfig;

    if (gameTargetSection === 'tz') {
      const exists = config.featured_tz_games.some(g => g.id === found.id);
      if (exists) {
        alert('Game hili tayari lipo kwenye orodha ya Tanzania!');
        return;
      }
      updatedConfig = {
        ...config,
        featured_tz_games: [...config.featured_tz_games, newGame],
      };
    } else {
      const exists = config.featured_intl_games.some(g => g.id === found.id);
      if (exists) {
        alert('Game hili tayari lipo kwenye orodha ya Kimataifa!');
        return;
      }
      updatedConfig = {
        ...config,
        featured_intl_games: [...config.featured_intl_games, newGame],
      };
    }

    setConfig(updatedConfig);
    handleSaveConfig(updatedConfig);

    // Reset inputs
    setSelectedGameId('');
    setGameCustomNote('');
  };

  const handleRemoveGame = (id: string, section: 'tz' | 'intl') => {
    let updatedConfig: AssistantConfig;
    if (section === 'tz') {
      updatedConfig = {
        ...config,
        featured_tz_games: config.featured_tz_games.filter(g => g.id !== id),
      };
    } else {
      updatedConfig = {
        ...config,
        featured_intl_games: config.featured_intl_games.filter(g => g.id !== id),
      };
    }
    setConfig(updatedConfig);
    handleSaveConfig(updatedConfig);
  };

  // Add Hidden Video to Vault
  const handleAddVideo = () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      alert('Tafadhali jaza Jina la Video na Link ya YouTube!');
      return;
    }

    const newVideo: VideoVaultItem = {
      id: 'vault_' + Date.now(),
      title: videoTitle.trim(),
      youtubeUrl: videoUrl.trim(),
      keywords: videoKeywords.trim(),
      instructions: videoInstructions.trim() || undefined,
    };

    const updatedConfig = {
      ...config,
      hidden_video_vault: [newVideo, ...config.hidden_video_vault],
    };

    setConfig(updatedConfig);
    handleSaveConfig(updatedConfig);

    // Reset inputs
    setVideoTitle('');
    setVideoUrl('');
    setVideoKeywords('');
    setVideoInstructions('');
  };

  const handleRemoveVideo = (id: string) => {
    const updatedConfig = {
      ...config,
      hidden_video_vault: config.hidden_video_vault.filter(v => v.id !== id),
    };
    setConfig(updatedConfig);
    handleSaveConfig(updatedConfig);
  };

  // Compute distinct categories from catalog
  const availableCategories = Array.from(
    new Set(catalog.map(g => (g.category || 'General').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Compute filtered catalog based on category and search query
  const filteredCatalog = catalog.filter(g => {
    const matchesCategory =
      catalogCategoryFilter === 'ALL' ||
      (g.category || 'General').toLowerCase() === catalogCategoryFilter.toLowerCase();
    const matchesSearch =
      !catalogSearch.trim() ||
      (g.title || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (g.category || '').toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedGame = catalog.find(g => g.id === selectedGameId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060913] text-slate-400">
        <div className="flex flex-col items-center gap-3 font-bold text-xs">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-slate-300 font-mono tracking-wider">Inapakia Mipangilio ya AI Assistant...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-4 px-4 sm:px-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>AI ASSISTANT & SUPPORT CONTROLLER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Usimamizi wa Chidy AI Msaidizi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
            Weka games za kipaumbele (Tanzania & Kimataifa), dhibiti siri ya links za YouTube za kuelekeza wateja, na rekebisha sheria za kuzuia ulaghai.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Inahifadhi...' : savedSuccess ? 'Imehifadhiwa!' : 'Hifadhi Mabadiliko'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Mipangilio ya Chidy Assistant imehifadhiwa na ipo hewani papo hapo kwa wateja wote!</span>
        </div>
      )}

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'games'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Games za Kipaumbele (TZ & Intl)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {config.featured_tz_games.length + config.featured_intl_games.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vault'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Siri ya Video (YouTube Vault)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {config.hidden_video_vault.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Mipangilio & Ulinzi (Anti-Spam)</span>
        </button>
      </div>

      {/* ── TAB 1: FEATURED / PRIORITY GAMES ── */}
      {activeTab === 'games' && (
        <div className="space-y-8">
          
          {/* Form: Add a Game to Priority */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
              <Plus className="w-5 h-5 text-blue-400" />
              <span>Pandikiza Game la Kipaumbele kwa Msaidizi</span>
            </h2>
            <p className="text-xs text-slate-400">
              Mteja akisema &quot;nataka game&quot; au asipojua game la kuchagua, Assistant atamtumia moja kwa moja games hizi zikiwa na maelezo yako na kitufe cha kulipia papo hapo.
            </p>

            {/* Category Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Chuja Game kwa Category au Tafuta kwa Jina:</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Zinazoonekana: <strong className="text-white">{filteredCatalog.length}</strong> kati ya {catalog.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category selector */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Layers className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    value={catalogCategoryFilter}
                    onChange={(e) => {
                      setCatalogCategoryFilter(e.target.value);
                      setSelectedGameId(''); // reset selection when category changes
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                  >
                    <option value="ALL">📁 CATEGORY ZOTE ({catalog.length} Games)</option>
                    {availableCategories.map(cat => {
                      const count = catalog.filter(g => (g.category || 'General').toUpperCase() === cat.toUpperCase()).length;
                      return (
                        <option key={cat} value={cat}>
                          📂 {cat} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Search input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Andika jina la game kutafuta (mf. Maleo, ETS2, FIFA)..."
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      setSelectedGameId('');
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Select from filtered catalog */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                  <span>Chagua Game:</span>
                  {selectedGame && (
                    <span className="text-[10px] text-cyan-400 font-mono">TSh {Number(selectedGame.price || 0).toLocaleString()}</span>
                  )}
                </label>
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">
                    {filteredCatalog.length === 0 
                      ? '-- Hakuna game lililopatikana --' 
                      : `-- Chagua Game Hapa (${filteredCatalog.length} Yaliyopo) --`}
                  </option>
                  {filteredCatalog.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} [{g.category || 'General'}] - TSh {Number(g.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Section (Tanzania vs International) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Kitengo cha Game:</label>
                <select
                  value={gameTargetSection}
                  onChange={(e) => setGameTargetSection(e.target.value as 'tz' | 'intl')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="tz">🇹🇿 Games za Tanzania (Mabasi, Malori, Ligi Kuu)</option>
                  <option value="intl">🌍 Games Zisizo za TZ / Kimataifa (GTA, FIFA, nk)</option>
                </select>
              </div>

              {/* Custom Note/Pitch */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Maelezo Maalum ya Chidy (Hiari):</label>
                <input
                  type="text"
                  placeholder="Mfano: Game hili lina mabasi yote ya Dar-Mwanza na milio halisi!"
                  value={gameCustomNote}
                  onChange={(e) => setGameCustomNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Selected Game Preview Card */}
            {selectedGame && (
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                  {selectedGame.cover_image ? (
                    <Image src={selectedGame.cover_image} alt={selectedGame.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white truncate">{selectedGame.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase">
                      {selectedGame.category || 'General'}
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      TSh {Number(selectedGame.price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleAddGame}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ongeza Sasa</span>
                </button>
              </div>
            )}

            {!selectedGame && (
              <button
                onClick={handleAddGame}
                disabled={!selectedGameId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeza Kwenye Kipaumbele</span>
              </button>
            )}
          </div>

          {/* Section 1: 🇹🇿 Games za Tanzania */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
                <span>🇹🇿 Games za Kipaumbele: Tanzania Mods & Mabasi ({config.featured_tz_games.length})</span>
              </h3>
            </div>

            {config.featured_tz_games.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Hujaweka game lolote la kipaumbele la Tanzania. Chagua game juu kisha ubofye &quot;Ongeza&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.featured_tz_games.map(g => (
                  <div key={g.id} className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 flex gap-3 shadow-lg group hover:border-emerald-500/40 transition-all">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      {g.cover_image ? (
                        <Image src={g.cover_image} alt={g.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-black text-white truncate">{g.title}</h4>
                      <p className="text-[10px] text-emerald-400 font-bold">TSh {Number(g.price).toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        {g.customNote || 'Game moto lililopendekezwa na Chidy!'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveGame(g.id, 'tz')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Ondoa kwenye kipaumbele"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: 🌍 Games za Kimataifa */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-cyan-400 flex items-center gap-2 uppercase tracking-wide">
                <span>🌍 Games za Kipaumbele: Kimataifa / Nje ya TZ ({config.featured_intl_games.length})</span>
              </h3>
            </div>

            {config.featured_intl_games.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Hujaweka game lolote la kipaumbele la Kimataifa (mf. GTA, FIFA, eFootball). Chagua game juu kisha ubofye &quot;Ongeza&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.featured_intl_games.map(g => (
                  <div key={g.id} className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 flex gap-3 shadow-lg group hover:border-cyan-500/40 transition-all">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      {g.cover_image ? (
                        <Image src={g.cover_image} alt={g.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-black text-white truncate">{g.title}</h4>
                      <p className="text-[10px] text-cyan-400 font-bold">TSh {Number(g.price).toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        {g.customNote || 'Game moto la Kimataifa!'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveGame(g.id, 'intl')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Ondoa kwenye kipaumbele"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SIRI YA VIDEO / HIDDEN VIDEO VAULT ── */}
      {activeTab === 'vault' && (
        <div className="space-y-8">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
              <Youtube className="w-5 h-5 text-red-500" />
              <span>Weka Video ya Siri / Siri ya Links za YouTube</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Video hizi <strong>hazitaonekana kwenye ukurasa wa mbele (feed) wa website</strong>, lakini Assistant atazitumia papo hapo kuelekeza wateja wanaouliza jinsi ya ku-set au ku-install games zao!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Jina la Video / Mada ya Game:</label>
                <input
                  type="text"
                  placeholder="Mfano: Jinsi ya kuweka Mod ya Mabasi ya Tanzania kwenye Maleo"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">YouTube Video Link:</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Maneno Muhimu (Keywords zilizotenganishwa kwa mkato):</label>
                <input
                  type="text"
                  placeholder="maleo, bus, mabasi, install, kuset, obb, bongo"
                  value={videoKeywords}
                  onChange={(e) => setVideoKeywords(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Maelezo ya Hatua (Hiari):</label>
                <input
                  type="text"
                  placeholder="Mfano: 1. Extract ZIP 2. Hamisha folda kwenda Android/obb 3. Fungua game"
                  value={videoInstructions}
                  onChange={(e) => setVideoInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button
              onClick={handleAddVideo}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Hifadhi Kwenye Siri ya Video</span>
            </button>
          </div>

          {/* Orodha ya Video zilizopo kwenye Vault */}
          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <span>Video za Siri Zilizopo ({config.hidden_video_vault.length})</span>
            </h3>

            {config.hidden_video_vault.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Hujaongeza video yoyote ya siri. Unaweza kuongeza hapo juu ili msaidizi aweze kutoa video sahihi mteja anapouliza jinsi ya kuset!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.hidden_video_vault.map(v => (
                  <div key={v.id} className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 group hover:border-red-500/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{v.title}</span>
                        </h4>
                        <a
                          href={v.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono break-all"
                        >
                          <span>{v.youtubeUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <button
                        onClick={() => handleRemoveVideo(v.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                        title="Futa video hii"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Keywords:</span>
                      {v.keywords.split(',').map((k, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                          {k.trim()}
                        </span>
                      ))}
                    </div>

                    {v.instructions && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        {v.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: GENERAL SETTINGS & ANTI-SPAM ── */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Mipangilio ya Ulinzi na Mawasiliano</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Welcome message */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Ujumbe wa Ukaribisho (Welcome Message):</label>
              <textarea
                rows={3}
                value={config.welcome_message}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Ujumbe huu utatokea kiotomatiki mara tu mteja anapofungua ukurasa wa msaada.
              </p>
            </div>

            {/* General YouTube Channel */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">YouTube Channel Rasmi ya ChidyGaming:</label>
              <input
                type="text"
                value={config.general_youtube_url}
                onChange={(e) => setConfig({ ...config, general_youtube_url: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Inatumika kama mteja akiomba video ya game ambalo halina video maalum kwenye vault.
              </p>
            </div>

            {/* Max Unpaid Attempts */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Upeo wa Majaribio Bila Malipo Kabla ya Kumfungia:</label>
              <input
                type="number"
                min={2}
                max={15}
                value={config.max_unpaid_attempts}
                onChange={(e) => setConfig({ ...config, max_unpaid_attempts: Number(e.target.value) || 5 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Mteja akidai &quot;nimelipa&quot; zaidi ya mara hii (default: 5) wakati hajalipa, sehemu ya msaada inajifunga.
              </p>
            </div>

            {/* Lockout duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Muda wa Kufungwa kwa Akaunti (Dakika):</label>
              <input
                type="number"
                min={10}
                max={1440}
                value={config.lockout_minutes}
                onChange={(e) => setConfig({ ...config, lockout_minutes: Number(e.target.value) || 60 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Muda ambao mtumiaji aliyefungiwa atasubiri kabla ya kuweza kuandika tena (mf. dakika 60 = lisaa 1).
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
