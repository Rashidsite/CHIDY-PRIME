'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BellRing,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
  Heading,
  MousePointerClick,
  Link as LinkIcon,
  Tag,
  Loader2,
  Gamepad2,
  X
} from 'lucide-react';

interface PopupConfig {
  enabled: boolean;
  title: string;
  message: string;
  btn_text: string;
  btn_link: string;
  icon: string;
  badge: string;
  delay_seconds: number;
}

const DEFAULT_CONFIG: PopupConfig = {
  enabled: false,
  title: 'TANGAZO LA GAME',
  message: 'Cheza game mpya kwa kubonyeza hapa chini!',
  btn_text: 'FUNGUA HAPA',
  btn_link: 'https://chidyprimetz.com/games',
  icon: '🎮',
  badge: 'HOT GAME',
  delay_seconds: 3,
};

const QUICK_ICONS = ['🎮', '🕹️', '🔥', '🏆', '🎲', '⚡', '🚀', '⭐'];

export default function AdminPopupPage() {
  const [config, setConfig] = useState<PopupConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/popup');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          ...DEFAULT_CONFIG,
          ...data.config,
        });
      }
    } catch (err: any) {
      console.error('Failed to load popup config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast(config.enabled ? '🎮 Tangazo la Game limeWASHA na kuhifadhiwa!' : '⚪ Tangazo la Game limeZIMWA na kuhifadhiwa!');
      } else {
        showToast('❌ Hitilafu: ' + (data.error || 'Imeshindikana kuhifadhi'), 'error');
      }
    } catch (err: any) {
      showToast('❌ Hitilafu ya mtandao: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3 font-bold text-xs">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-slate-300 tracking-wider font-mono uppercase">Inapakia Mipangilio ya Popup...</span>
        </div>
      </div>
    );
  }

  const isImg = config.icon.startsWith('http://') || config.icon.startsWith('https://') || config.icon.startsWith('/');

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border text-sm font-bold transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-rose-500/20'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-cyan-500/25 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] shrink-0">
            <BellRing className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Game Popup Ads & Notifications
              </h1>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  config.enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {config.enabled ? '🟢 IMEWASHWA (ACTIVE)' : '⚪ IMEZIMWA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dhibiti popup inayoelea kwenye website ya games. Unaweza kuwasha, kuzima, kubadili jina, maelezo, link ya kitufe na muda wa kutokea.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showLivePreview ? 'Ficha Preview' : 'Jaribu Preview'}</span>
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Inahifadhi...' : 'Hifadhi Mabadiliko'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Status Toggle Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Hali ya Popup (Status Toggle)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Washa au zima popup hii isionekane kwa watumiaji wa tovuti.
                </p>
              </div>

              {/* iOS / Cyber Styled Toggle */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none cursor-pointer border ${
                  config.enabled ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Configuration Form Card */}
          <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Gamepad2 className="w-4 h-4 text-blue-400" />
              Taarifa za Tangazo (Ad Content)
            </h3>

            {/* Row 1: Title & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Heading className="w-3.5 h-3.5 text-cyan-400" />
                  Kichwa cha Tangazo (Title)
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Mfano: TANGAZO LA GAME"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-pink-400" />
                  Lebo / Badge (Hiari)
                </label>
                <input
                  type="text"
                  value={config.badge}
                  onChange={(e) => setConfig({ ...config, badge: e.target.value })}
                  placeholder="Mfano: HOT GAME, NEW, au PROMO"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 2: Message / Description */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                Ujumbe / Maelezo (Description)
              </label>
              <textarea
                rows={2}
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Cheza game mpya kwa kubonyeza hapa chini!"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium resize-none"
                required
              />
            </div>

            {/* Row 3: Button Text & Button Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <MousePointerClick className="w-3.5 h-3.5 text-pink-400" />
                  Maandishi ya Kitufe (Button Text)
                </label>
                <input
                  type="text"
                  value={config.btn_text}
                  onChange={(e) => setConfig({ ...config, btn_text: e.target.value })}
                  placeholder="Mfano: FUNGUA HAPA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Link ya Kitufe (Target URL)
                </label>
                <input
                  type="url"
                  value={config.btn_link}
                  onChange={(e) => setConfig({ ...config, btn_link: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Row 4: Icon/Emoji & Delay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between mb-2">
                  <span>Emoji au Icon Image URL</span>
                  <span className="text-[10px] text-slate-500 lowercase">emoji au link</span>
                </label>
                
                {/* Quick Emoji Buttons */}
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {QUICK_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setConfig({ ...config, icon: emoji })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all ${
                        config.icon === emoji
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={config.icon}
                  onChange={(e) => setConfig({ ...config, icon: e.target.value })}
                  placeholder="🎮 au https://.../icon.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Muda wa Kuchelewa (Delay Seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={config.delay_seconds}
                  onChange={(e) => setConfig({ ...config, delay_seconds: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Sekunde ngapi zipite tangu ukurasa ufunguke kabla ya popup haijatokea kwa mteja.
                </p>
              </div>
            </div>

            {/* Bottom Submit */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Inahifadhi...' : 'Hifadhi Mipangilio ya Popup'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Live Interactive Mockup (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg sticky top-8">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
              <Eye className="w-4 h-4 text-cyan-400" />
              Muonekano Halisi (Realtime Mockup)
            </h3>

            {/* Simulated Desktop Preview Container */}
            <div className="relative h-64 bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-end p-4 shadow-inner">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00f2ff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              
              {/* Fake Website Content Behind */}
              <div className="absolute top-4 left-4 right-4 space-y-2 opacity-30">
                <div className="h-3 bg-slate-700 rounded w-1/3" />
                <div className="h-2 bg-slate-800 rounded w-2/3" />
                <div className="h-2 bg-slate-800 rounded w-1/2" />
              </div>

              {/* The Actual Floating Toast Component Mockup */}
              <div
                style={{
                  background: 'linear-gradient(145deg, #131520, #0a0b10)',
                  borderColor: '#00f2ff',
                  boxShadow: '0 8px 25px rgba(0, 242, 255, 0.3), 0 0 10px rgba(0, 242, 255, 0.2)',
                }}
                className="border rounded-xl p-3 text-white max-w-sm w-full relative z-10 transition-all"
              >
                {/* Close X */}
                <button
                  type="button"
                  className="absolute top-1.5 right-2 text-slate-400 hover:text-pink-400 text-sm font-bold"
                  title="Funga"
                >
                  &times;
                </button>

                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-2xl shrink-0">
                    {isImg ? (
                      <img src={config.icon} alt="icon" className="w-7 h-7 rounded object-cover" />
                    ) : (
                      <span>{config.icon || '🎮'}</span>
                    )}
                  </div>

                  {/* Text Body */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider truncate">
                        {config.title || 'TANGAZO LA GAME'}
                      </h4>
                      {config.badge && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                          {config.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight mb-2">
                      {config.message || 'Cheza game mpya kwa kubonyeza hapa chini!'}
                    </p>

                    <a
                      href={config.btn_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#ff10f0',
                        boxShadow: '0 0 14px rgba(255, 16, 240, 0.45)',
                      }}
                      className="inline-block text-[11px] font-black uppercase text-white px-3.5 py-1 rounded-md hover:brightness-110 transition-all"
                    >
                      {config.btn_text || 'FUNGUA HAPA'}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="text-white font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Kwenye Kompyuta na Simu:
              </p>
              <p>• Kwenye Computer (PC): Inakaa chini kulia mwa ukurasa.</p>
              <p>• Kwenye Simu (Mobile): Inakaa katikati chini bila kufunika menu ya simu.</p>
              <p>• Mtumiaji akiifunga mara moja, haitamsumbua tena akiendelea kubonyeza kurasa nyingine.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Real Preview at bottom right of screen when toggled */}
      {showLivePreview && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '320px',
            background: 'linear-gradient(145deg, #131520, #0a0b10)',
            border: '1px solid #00f2ff',
            borderRadius: '14px',
            padding: '12px 14px',
            boxShadow: '0 8px 25px rgba(0, 242, 255, 0.3), 0 0 10px rgba(0, 242, 255, 0.2)',
            zIndex: 999999,
            color: '#ffffff',
            animation: 'slideUp 0.35s ease-out',
          }}
        >
          <button
            onClick={() => setShowLivePreview(false)}
            style={{
              position: 'absolute',
              top: '6px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            title="Funga"
          >
            &times;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                fontSize: '26px',
                background: 'rgba(0, 242, 255, 0.1)',
                border: '1px solid rgba(0, 242, 255, 0.25)',
                padding: '8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isImg ? (
                <img src={config.icon} alt="Icon" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <span>{config.icon || '🎮'}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', paddingRight: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '12.5px', color: '#00f2ff', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {config.title || 'TANGAZO LA GAME'}
                </h4>
                {config.badge && (
                  <span style={{ background: 'rgba(0, 242, 255, 0.15)', color: '#00f2ff', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '99px', border: '1px solid rgba(0, 242, 255, 0.4)', whiteSpace: 'nowrap' }}>
                    {config.badge}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.35', wordBreak: 'break-word' }}>
                {config.message}
              </p>
              <a
                href={config.btn_link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#ff10f0',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '5px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 0 14px rgba(255, 16, 240, 0.45)',
                }}
              >
                {config.btn_text || 'FUNGUA HAPA'}
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
