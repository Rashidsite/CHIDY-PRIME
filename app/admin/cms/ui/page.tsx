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
  Loader2
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

            {/* Style Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'glassmorphism', label: 'Glassmorphism Blur', desc: 'Frosted blur yenye uwazi wa kisasa' },
                { id: 'obsidian', label: 'Solid Dark Obsidian', desc: 'Nyeusi thabiti isiyopenya mwanga' },
                { id: 'pill', label: 'Pill Floating Bar', desc: 'Baa inayoelea katikati yenye kona zilizoviringika' },
                { id: 'docked', label: 'Flat Docked Bar', desc: 'Muundo ulioshikamana chini kabisa' },
              ].map((styleOption) => (
                <div
                  key={styleOption.id}
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      bottom_nav: { ...p.bottom_nav, style: styleOption.id as BottomNavStyle },
                    }))
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    config.bottom_nav.style === styleOption.id
                      ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <h4 className="text-xs font-black text-white uppercase">{styleOption.label}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{styleOption.desc}</p>
                </div>
              ))}
            </div>

            {/* Badge Indicator Toggle */}
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
        </div>
      )}
    </div>
  );
}
