'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { 
  Settings, 
  Image as ImageIcon, 
  Save, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  Eye, 
  RefreshCw,
  Clock,
  Palette
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettingsPage() {
  const [bgEnabled, setBgEnabled] = useState(true);
  const [bgImageUrl, setBgImageUrl] = useState('/game_controller_bg.jpg');
  const [bgOpacity, setBgOpacity] = useState(0.45);
  const [slideshowDuration, setSlideshowDuration] = useState(5);
  const [slideshowUnit, setSlideshowUnit] = useState<'seconds' | 'minutes'>('seconds');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data?.settings) {
        const bg = data.settings.custom_background || data.background;
        if (bg) {
          setBgEnabled(bg.enabled !== false);
          setBgImageUrl(bg.image_url || '/game_controller_bg.jpg');
          setBgOpacity(bg.opacity ?? 0.45);
        }

        const ss = data.settings.slideshow_settings;
        if (ss) {
          setSlideshowDuration(ss.duration || 5);
          setSlideshowUnit(ss.unit || 'seconds');
        }
      }
    } catch (err) {
      console.warn('Failed to load settings via API, using Supabase client:', err);
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'custom_background')
          .maybeSingle();

        if (data?.value) {
          setBgEnabled(data.value.enabled !== false);
          setBgImageUrl(data.value.image_url || '/game_controller_bg.jpg');
          setBgOpacity(data.value.opacity ?? 0.45);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const bgPayload = {
        enabled: bgEnabled,
        image_url: bgImageUrl.trim(),
        opacity: Number(bgOpacity),
      };

      const ssPayload = {
        duration: Number(slideshowDuration),
        unit: slideshowUnit,
      };

      // 1. Save custom_background
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'custom_background',
          value: bgPayload,
        }),
      });

      // 2. Save slideshow_settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'slideshow_settings',
          value: ssPayload,
        }),
      });

      // 3. Fallback direct client upsert to ensure complete DB persistence
      await supabase
        .from('site_settings')
        .upsert({ key: 'custom_background', value: bgPayload }, { onConflict: 'key' });

      await supabase
        .from('store_settings')
        .upsert({ key: 'custom_background', value: bgPayload }, { onConflict: 'key' });

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  const PRESETS = [
    { name: 'Default Controller', url: '/game_controller_bg.jpg', opacity: 0.45 },
    { name: 'Cyber Neon Grid', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&q=80', opacity: 0.35 },
    { name: 'Dark Abstract Vault', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80', opacity: 0.4 },
    { name: 'Pure Midnight', url: '', opacity: 0.1 },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-400" />
            <span>Store Configuration &amp; Custom Background</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure full custom background image overlay, slideshow speed, and payment settings synced directly with the public storefront.
          </p>
        </div>

        <button
          onClick={loadSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* ── Custom Background Section ── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Full Custom Background Image Overlay
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Applies high-resolution ambient gaming backdrop across the entire storefront.
                </p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bgEnabled}
                onChange={(e) => setBgEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            
            {/* Left Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  Background Image Direct URL (ImgBB Hosted)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://i.ibb.co/... or /game_controller_bg.jpg"
                    value={bgImageUrl}
                    onChange={(e) => setBgImageUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <ImgBBUploadModal
                    onUploadSuccess={(url) => setBgImageUrl(url)}
                    buttonLabel="Upload ImgBB"
                  />
                </div>
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Overlay Opacity</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                    {Math.round(bgOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
                  <span>Subtle (5%)</span>
                  <span>Balanced (45%)</span>
                  <span>Intense (90%)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-teal-400" />
                  <span>Quick Atmosphere Presets</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setBgImageUrl(p.url);
                        setBgOpacity(p.opacity);
                        setBgEnabled(!!p.url);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold hover:border-emerald-500/50 hover:text-white transition-all text-left truncate cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Preview Box */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Storefront Live Background Preview</span>
              </label>

              <div className="relative h-60 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center p-4">
                {bgEnabled && bgImageUrl ? (
                  <>
                    <div
                      className="absolute inset-0 transition-opacity duration-300"
                      style={{
                        backgroundImage: `url(${bgImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: bgOpacity,
                      }}
                    />
                    <div className="relative z-10 p-4 rounded-xl bg-black/75 border border-emerald-500/40 backdrop-blur-md text-center max-w-xs space-y-1">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                        Preview Active
                      </span>
                      <h4 className="text-xs font-black text-white uppercase truncate">
                        CHIDYPRIME x CHIDYGAMING
                      </h4>
                      <p className="text-[9px] text-slate-400 font-medium">
                        Background overlay opacity: {Math.round(bgOpacity * 100)}%
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-500 text-xs font-bold space-y-1">
                    <span className="block text-slate-600">Background Overlay Disabled</span>
                    <span className="text-[10px] text-slate-600 font-normal">Using standard dark theme</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ── Slideshow Duration Section ── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Hero Slideshow Speed &amp; Autoplay Interval
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Set how frequently the front exclusive banners rotate.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Interval Duration
              </label>
              <input
                type="number"
                min="2"
                max="60"
                value={slideshowDuration}
                onChange={(e) => setSlideshowDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Time Unit
              </label>
              <select
                value={slideshowUnit}
                onChange={(e) => setSlideshowUnit(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="seconds">Seconds (Sekunde)</option>
                <option value="minutes">Minutes (Dakika)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs text-emerald-400 font-black flex items-center gap-1.5 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved &amp; Synced to Storefront!
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-bold">
              Changes apply instantly to the public website upon saving.
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
