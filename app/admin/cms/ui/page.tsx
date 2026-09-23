'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Smartphone,
  Sparkles,
  Sliders,
  CheckCircle2,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Layers,
  Zap,
  Radio,
  Gamepad2,
  PackageCheck,
  User,
  MessageCircle,
  Store,
  Flame,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Check
} from 'lucide-react';
import {
  DEFAULT_CMS_CONFIG,
  CMSConfigData,
  BottomNavItem,
  BottomNavStyle,
  ButtonPreset,
  CornerRadius
} from '@/lib/cmsDefaults';

const AVAILABLE_ICONS = [
  'Gamepad2',
  'Sparkles',
  'PackageCheck',
  'User',
  'MessageCircle',
  'Store',
  'Home',
  'Flame',
  'Search',
  'ShoppingCart',
  'Phone'
];

export default function AdminUICMSPage() {
  const [config, setConfig] = useState<CMSConfigData>(DEFAULT_CMS_CONFIG);
  const [activeTab, setActiveTab] = useState<'bottom_nav' | 'animations' | 'theme_presets'>('bottom_nav');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/ui');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load UI CMS config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms/ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Mabadiliko ya UI na Realtime CMS yamehifadhiwa na kurushwa live!');
      } else {
        showToast('❌ Hitilafu: ' + (data.error || 'Imeshindikana kuhifadhi'));
      }
    } catch (err: any) {
      showToast('❌ Hitilafu ya mawasiliano: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Bottom Nav Helpers
  const addNavItem = () => {
    const newItem: BottomNavItem = {
      id: `nav-${Date.now()}`,
      label: 'Kiungo Kipya',
      icon: 'Gamepad2',
      url: '/front',
      is_live: true,
      badge: '',
    };
    setConfig((prev) => ({
      ...prev,
      bottom_nav: {
        ...prev.bottom_nav,
        items: [...prev.bottom_nav.items, newItem],
      },
    }));
  };

  const updateNavItem = (id: string, updates: Partial<BottomNavItem>) => {
    setConfig((prev) => ({
      ...prev,
      bottom_nav: {
        ...prev.bottom_nav,
        items: prev.bottom_nav.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      },
    }));
  };

  const deleteNavItem = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      bottom_nav: {
        ...prev.bottom_nav,
        items: prev.bottom_nav.items.filter((item) => item.id !== id),
      },
    }));
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const items = [...config.bottom_nav.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setConfig((prev) => ({
      ...prev,
      bottom_nav: {
        ...prev.bottom_nav,
        items,
      },
    }));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-glow">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              🎨 UI & CMS Theme Controls
            </h1>
            <p className="text-xs text-blue-400 font-bold mt-1">
              Dynamic Realtime Navigation, Visual Animations & Storefront Button Customizer
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer touch-manipulation disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Inarusha Realtime...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Hifadhi & Rusha Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-2.5 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bottom_nav')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
            activeTab === 'bottom_nav'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Mobile Bottom Nav</span>
        </button>

        <button
          onClick={() => setActiveTab('animations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
            activeTab === 'animations'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Visual Effects & Animations</span>
        </button>

        <button
          onClick={() => setActiveTab('theme_presets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
            activeTab === 'theme_presets'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Buttons & Theme Presets</span>
        </button>
      </div>

      {/* ── TAB 1: MOBILE BOTTOM NAVIGATION MANAGER ── */}
      {activeTab === 'bottom_nav' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Mobile Bottom Nav Settings
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Badilisha muundo, mtindo wa bar, na vitufe vya menyu ya chini ya simu.
                </p>
              </div>

              {/* Live Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">Hali ya Menyu:</span>
                <button
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      bottom_nav: { ...p.bottom_nav, is_active: !p.bottom_nav.is_active },
                    }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                    config.bottom_nav.is_active
                      ? 'bg-emerald-600 text-white border border-emerald-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {config.bottom_nav.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{config.bottom_nav.is_active ? 'LIVE (INAFANYA KAZI)' : 'DRAFT (IMEZIMWA)'}</span>
                </button>
              </div>
            </div>

            {/* Upgraded Style Selector with Visual Mockups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Chagua Muundo wa Baa ya Chini (Select Bottom Bar Architecture)
                </span>
                <span className="text-[11px] font-bold text-blue-400">
                  {config.bottom_nav.style.toUpperCase()} IMECHAGULIWA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {[
                  {
                    id: 'pill',
                    label: 'Pill Floating Bar',
                    badge: 'INAYOPENDELEWA',
                    desc: 'Baa inayoelea katikati yenye kona zilizoviringika na shadow',
                    renderMock: (isSelected: boolean) => (
                      <div className="w-full h-16 rounded-xl bg-slate-950 border border-slate-800/80 relative flex flex-col justify-between p-1.5 overflow-hidden">
                        <div className="flex justify-between items-center px-1 opacity-40">
                          <div className="w-8 h-1 rounded bg-slate-700" />
                          <div className="w-3 h-1 rounded bg-slate-700" />
                        </div>
                        {/* Mock Content */}
                        <div className="space-y-1 px-1 opacity-25">
                          <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                          <div className="w-1/2 h-1.5 rounded bg-slate-700" />
                        </div>
                        {/* Floating Pill Mockup */}
                        <div className={`w-[90%] mx-auto h-5 rounded-full flex items-center justify-around px-2 border transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                            : 'bg-slate-900/90 border-slate-700'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'cyber_neon',
                    label: 'Cyberpunk Neon Glow',
                    badge: 'VIP EDITION',
                    desc: 'Muundo wa kifahari wenye kingo za neon na mwangaza wa cyan',
                    renderMock: (isSelected: boolean) => (
                      <div className="w-full h-16 rounded-xl bg-slate-950 border border-slate-800/80 relative flex flex-col justify-between p-1.5 overflow-hidden">
                        <div className="flex justify-between items-center px-1 opacity-40">
                          <div className="w-8 h-1 rounded bg-slate-700" />
                          <div className="w-3 h-1 rounded bg-slate-700" />
                        </div>
                        <div className="space-y-1 px-1 opacity-25">
                          <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                          <div className="w-1/2 h-1.5 rounded bg-slate-700" />
                        </div>
                        {/* Cyber Neon Mockup */}
                        <div className={`w-[90%] mx-auto h-5 rounded-full flex items-center justify-around px-2 border-2 transition-all ${
                          isSelected
                            ? 'bg-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                            : 'bg-slate-950 border-cyan-500/50 shadow-[0_0_6px_rgba(6,182,212,0.3)]'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'glassmorphism',
                    label: 'Glassmorphism Blur',
                    badge: 'FROSTED GLASS',
                    desc: 'Kioo chenye uwazi wa kisasa kinachopenyeza rangi ya nyuma',
                    renderMock: (isSelected: boolean) => (
                      <div className="w-full h-16 rounded-xl bg-gradient-to-b from-slate-950 to-blue-950/40 border border-slate-800/80 relative flex flex-col justify-between p-1.5 overflow-hidden">
                        <div className="flex justify-between items-center px-1 opacity-40">
                          <div className="w-8 h-1 rounded bg-slate-700" />
                          <div className="w-3 h-1 rounded bg-slate-700" />
                        </div>
                        <div className="space-y-1 px-1 opacity-25">
                          <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                          <div className="w-1/2 h-1.5 rounded bg-slate-700" />
                        </div>
                        {/* Glass Mockup */}
                        <div className={`w-full h-5 rounded-b-lg flex items-center justify-around px-2 border-t backdrop-blur-md transition-all ${
                          isSelected
                            ? 'bg-slate-900/60 border-blue-400 shadow-md'
                            : 'bg-slate-900/40 border-white/20'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'obsidian',
                    label: 'Solid Dark Obsidian',
                    badge: 'OLED PURE BLACK',
                    desc: 'Nyeusi thabiti isiyopenya mwanga yenye utulivu mkubwa',
                    renderMock: (isSelected: boolean) => (
                      <div className="w-full h-16 rounded-xl bg-slate-950 border border-slate-800/80 relative flex flex-col justify-between p-1.5 overflow-hidden">
                        <div className="flex justify-between items-center px-1 opacity-40">
                          <div className="w-8 h-1 rounded bg-slate-700" />
                          <div className="w-3 h-1 rounded bg-slate-700" />
                        </div>
                        <div className="space-y-1 px-1 opacity-25">
                          <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                          <div className="w-1/2 h-1.5 rounded bg-slate-700" />
                        </div>
                        {/* Obsidian Mockup */}
                        <div className={`w-full h-5 rounded-b-lg bg-[#04060b] flex items-center justify-around px-2 border-t transition-all ${
                          isSelected
                            ? 'border-blue-500 shadow-lg'
                            : 'border-slate-800'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'docked',
                    label: 'Flat Docked Bar',
                    badge: 'FULL DOCK',
                    desc: 'Muundo ulioshikamana chini kabisa kwa mpangilio thabiti',
                    renderMock: (isSelected: boolean) => (
                      <div className="w-full h-16 rounded-xl bg-slate-950 border border-slate-800/80 relative flex flex-col justify-between p-1.5 overflow-hidden">
                        <div className="flex justify-between items-center px-1 opacity-40">
                          <div className="w-8 h-1 rounded bg-slate-700" />
                          <div className="w-3 h-1 rounded bg-slate-700" />
                        </div>
                        <div className="space-y-1 px-1 opacity-25">
                          <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                          <div className="w-1/2 h-1.5 rounded bg-slate-700" />
                        </div>
                        {/* Docked Mockup */}
                        <div className={`w-full h-5 rounded-b-lg bg-slate-950 flex items-center justify-around px-2 border-t-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 shadow-md'
                            : 'border-slate-800'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        </div>
                      </div>
                    ),
                  },
                ].map((styleOption) => {
                  const isSelected = config.bottom_nav.style === styleOption.id;
                  return (
                    <div
                      key={styleOption.id}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          bottom_nav: { ...p.bottom_nav, style: styleOption.id as BottomNavStyle },
                        }))
                      }
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-600/20'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      {/* Top status */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                          {styleOption.badge}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded-full shadow-sm">
                            <Check className="w-2.5 h-2.5" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                      </div>

                      {/* Visual Mockup Graphic */}
                      {styleOption.renderMock(isSelected)}

                      {/* Name & Desc */}
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight">{styleOption.label}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{styleOption.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Badge Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">Onyesha Beji za Arifa (Notification Badges)</span>
                <span className="text-[10px] text-slate-400">Ruhusu beji kama "HOT", "NEW", "LIVE" juu ya vitufe vya menyu</span>
              </div>
              <input
                type="checkbox"
                checked={config.bottom_nav.show_badge}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    bottom_nav: { ...p.bottom_nav, show_badge: e.target.checked },
                  }))
                }
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            {/* ── LIVE SMARTPHONE SIMULATOR (REALTIME STOREFRONT PREVIEW) ── */}
            <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Live Smartphone Simulator (Muonekano Halisi wa Simu)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Hivi ndivyo wateja wanavyoona baa ya chini na vitufe vinavyowaka moja kwa moja kwenye simu zao.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Mtindo Uliopo:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {config.bottom_nav.style.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Simulated Phone Shell */}
              <div className="max-w-md mx-auto rounded-[32px] p-3 bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-slate-700 shadow-2xl relative overflow-hidden">
                {/* Phone Speaker / Dynamic Island */}
                <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-slate-800" />
                  <div className="w-10 h-1 rounded-full bg-slate-800" />
                </div>

                {/* Phone Screen Canvas */}
                <div className="rounded-[22px] bg-[#090D16] border border-slate-800/80 p-3 min-h-[300px] flex flex-col justify-between relative overflow-hidden shadow-inner">
                  {/* Top Bar Mockup */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                        CP
                      </div>
                      <span className="text-[10px] font-black text-white tracking-tight">CHIDYPRIME GAMING</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      ● LIVE STORE
                    </span>
                  </div>

                  {/* Sample Post Game Card with Animated Button */}
                  <div className="my-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-14 h-11 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden relative">
                        <Gamepad2 className="w-6 h-6 text-blue-400" />
                        <span className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-[7px] font-black text-white text-center">
                          16:9 MOD
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[11px] font-black text-white truncate">ETS 2 MOBILE MOD TZ 2026</h5>
                        <p className="text-[9px] text-slate-400 truncate">Bus & Map Mod Tanzania (Toleo Jipya)</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-[8px] font-bold text-purple-400 uppercase block">Ufikiaji Masaa 24</span>
                        <span className="text-xs font-black text-white">TSh 5,000</span>
                      </div>

                      {/* Real Glowing Animated Buy Button Demo */}
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 btn-gaming-glow shadow-lg shadow-blue-600/50 border border-blue-400/80 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="icon-spark-pulse text-amber-300 text-xs">⚡</span>
                        <span className="relative z-10">NUNUA GAME</span>
                      </button>
                    </div>
                  </div>

                  {/* Simulated Storefront Bottom Navigation Bar */}
                  <div className="mt-auto pt-2">
                    <div
                      className={`w-full transition-all duration-300 ${
                        config.bottom_nav.style === 'pill'
                          ? 'rounded-full bg-slate-900/95 backdrop-blur-xl border border-blue-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(37,99,235,0.25)] px-2 py-1'
                          : config.bottom_nav.style === 'cyber_neon'
                          ? 'rounded-full bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] px-2 py-1'
                          : config.bottom_nav.style === 'obsidian'
                          ? 'rounded-xl bg-[#050811] border border-slate-800 shadow-xl px-2 py-1'
                          : config.bottom_nav.style === 'docked'
                          ? 'rounded-b-[20px] bg-slate-950 border-t-2 border-blue-600/70 px-2 py-1 -mx-3 -mb-3 p-3'
                          : 'rounded-xl bg-slate-950/80 backdrop-blur-lg border border-slate-800/80 px-2 py-1 shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-around">
                        {config.bottom_nav.items
                          .filter((i) => i.is_live)
                          .map((item, iIdx) => {
                            const isFirst = iIdx === 0;
                            return (
                              <div
                                key={item.id}
                                className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all relative ${
                                  isFirst ? 'text-blue-400 scale-105' : 'text-slate-400'
                                }`}
                              >
                                <div className="relative">
                                  <Gamepad2 className="w-4 h-4" />
                                  {config.bottom_nav.show_badge && item.badge && (
                                    <span className="absolute -top-1.5 -right-2 px-1 rounded-full text-[7px] font-black uppercase bg-blue-600 text-white shadow-sm ring-1 ring-slate-950">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[8px] font-black uppercase mt-0.5 tracking-tight ${isFirst ? 'text-blue-400' : 'text-slate-400'}`}>
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items CRUD List */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Vipengele vya Menyu (Navigation Items)
              </h3>
              <button
                onClick={addNavItem}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeza Kiungo</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {config.bottom_nav.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 shadow-md"
                >
                  {/* Top Bar: Re-order controls + Live status + Delete */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400">Nafasi #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveNavItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation"
                          title="Sogeza Juu"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveNavItem(idx, 'down')}
                          disabled={idx === config.bottom_nav.items.length - 1}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation"
                          title="Sogeza Chini"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateNavItem(item.id, { is_live: !item.is_live })}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider min-h-[38px] touch-manipulation transition-all cursor-pointer ${
                          item.is_live
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.is_live ? '🟢 LIVE' : '⚪ DRAFT'}
                      </button>
                      <button
                        onClick={() => deleteNavItem(item.id)}
                        className="p-2 rounded-xl bg-rose-600/15 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation cursor-pointer"
                        title="Futa Kiungo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Input Fields Grid: Stacks cleanly on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Label */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Jina (Label) *</label>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateNavItem(item.id, { label: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 min-h-[44px]"
                      />
                    </div>

                    {/* Icon Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Icon *</label>
                      <select
                        value={item.icon}
                        onChange={(e) => updateNavItem(item.id, { icon: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 min-h-[44px] cursor-pointer"
                      >
                        {AVAILABLE_ICONS.map((iconName) => (
                          <option key={iconName} value={iconName}>
                            {iconName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* URL */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target URL *</label>
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => updateNavItem(item.id, { url: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 min-h-[44px]"
                      />
                    </div>

                    {/* Badge Text */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Badge Text (Hiari)</label>
                      <input
                        type="text"
                        placeholder="e.g. HOT, NEW, LIVE"
                        value={item.badge || ''}
                        onChange={(e) => updateNavItem(item.id, { badge: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 uppercase min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ANIMATIONS & VISUAL EFFECTS ENGINE ── */}
      {activeTab === 'animations' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Animation & Visual Effects Engine
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Washa au zima madoido na animation mbalimbali za tovuti kwa wateja wote.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'button_glow_shimmer',
                title: '⚡ Vitufe Vya "Nunua Game" Vinavyowaka (Neon Glow & Shimmer)',
                desc: 'Mweko wa neon unaopumua (60fps pulsing aura) na mwale wa mwanga (shimmer sweep) kwenye vitufe vyote vya Nunua Game.',
              },
              {
                key: 'glowing_radar',
                title: 'Glowing Radar & Pulse Animation',
                desc: 'Mweko unaowaka kwenye vitufe vya msaada wa WhatsApp na ofa motomoto.',
              },
              {
                key: 'shimmer_loading',
                title: 'Shimmer Loading Skeletons',
                desc: 'Muundo wa kimulimuli wakati data za games zinapopakiwa kutoka kwenye database.',
              },
              {
                key: 'card_hover_scale',
                title: 'Card Hover Scale & Micro-Interactions',
                desc: 'Kadi kutanuka kidogo (zoom-in) mtumiaji anapogusa au kusogeza kipanya.',
              },
              {
                key: 'floating_support_pulse',
                title: 'Floating Support Widget Pulse',
                desc: 'Mapigo ya mwangaza kwenye WhatsApp support bubble ya pembeni.',
              },
            ].map((anim) => (
              <div
                key={anim.key}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-black text-white uppercase">{anim.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{anim.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={(config.animations as any)[anim.key]}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      animations: { ...p.animations, [anim.key]: e.target.checked },
                    }))
                  }
                  className="w-6 h-6 rounded accent-blue-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: BUTTON STYLE & THEME PRESET CUSTOMIZER ── */}
      {activeTab === 'theme_presets' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Button Style & Theme Presets
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Chagua muonekano wa vitufe vya storefront ("NUNUA", "PAKUA", "LIPA").
            </p>
          </div>

          {/* Preset Picker */}
          <div>
            <label className="text-xs font-black text-white uppercase block mb-3">Mtindo wa Rangi (Color Preset)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'royal_blue', label: 'Royal Blue Gradient', sample: 'from-blue-600 to-indigo-600 text-white' },
                { id: 'solid_emerald', label: 'Solid Emerald High-Tech', sample: 'bg-emerald-600 text-white' },
                { id: 'cyan_cyberpunk', label: 'Cyan Cyberpunk Neon', sample: 'bg-cyan-500 text-black' },
                { id: 'minimalist_border', label: 'Minimalist Border Glow', sample: 'bg-slate-900 border-2 border-blue-500 text-blue-400' },
              ].map((preset) => (
                <div
                  key={preset.id}
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      theme_presets: { ...p.theme_presets, button_preset: preset.id as ButtonPreset },
                    }))
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    config.theme_presets.button_preset === preset.id
                      ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black text-white uppercase block mb-3">{preset.label}</span>
                  <div className={`w-full py-2 px-3 rounded-xl text-[10px] font-black text-center uppercase shadow-md ${preset.sample}`}>
                    Sample Button ⚡
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corner Radius Picker */}
          <div>
            <label className="text-xs font-black text-white uppercase block mb-3">Kona za Vitufe (Corner Radius)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'rounded-xl', label: 'Medium Rounded (xl)' },
                { id: 'rounded-2xl', label: 'Extra Rounded (2xl)' },
                { id: 'rounded-full', label: 'Full Pill (Oval)' },
                { id: 'rounded-none', label: 'Sharp Cyberpunk (Box)' },
              ].map((rad) => (
                <div
                  key={rad.id}
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      theme_presets: { ...p.theme_presets, corner_radius: rad.id as CornerRadius },
                    }))
                  }
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    config.theme_presets.corner_radius === rad.id
                      ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-white">{rad.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Button Glow & Shimmer Interactive Test Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Live Interactive Preview: Kitufe cha Nunua Game Kinachowaka</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mtindo uliopo hapa chini unaakisiwa moja kwa moja kwenye kadi za mbele, droo, na mabango.
                </p>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ● 60FPS SMOOTH
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Mfano wa Kitufe:</span>
                <button
                  type="button"
                  className={`px-5 py-2.5 ${config.theme_presets.corner_radius} min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                    config.theme_presets.button_preset === 'cyan_cyberpunk'
                      ? 'bg-cyan-500 text-black btn-gaming-glow-cyan border border-cyan-300'
                      : config.theme_presets.button_preset === 'solid_emerald'
                      ? 'bg-emerald-600 text-white btn-gaming-glow-emerald border border-emerald-400'
                      : config.theme_presets.button_preset === 'minimalist_border'
                      ? 'bg-slate-900 text-blue-400 btn-gaming-glow border-2 border-blue-500'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white btn-gaming-glow border border-blue-400/80'
                  }`}
                >
                  <span className="icon-spark-pulse text-amber-300 text-sm">⚡</span>
                  <span className="relative z-10">NUNUA GAME SASA</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 max-w-xs">
                💡 Kitufe hiki kina mweko unaovutia wateja (breathing neon aura) na mwale wa nuru unaopita kila baada ya sekunde 3 bila kutumia betri nyingi.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
