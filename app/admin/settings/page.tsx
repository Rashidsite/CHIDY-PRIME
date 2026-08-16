'use client';

import React, { useState, useEffect } from 'react';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { Settings, Image as ImageIcon, Zap, Save, CheckCircle2, Sliders } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettingsPage() {
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0.35);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('*')
          .eq('key', 'custom_background')
          .single();

        if (data?.value) {
          setBgEnabled(data.value.enabled || false);
          setBgImageUrl(data.value.image_url || '');
          setBgOpacity(data.value.opacity || 0.35);
        }
      } catch (err) {}
    }
    loadSettings();
  }, [supabase]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const payload = {
        enabled: bgEnabled,
        image_url: bgImageUrl,
        opacity: Number(bgOpacity),
      };

      const { error } = await supabase
        .from('store_settings')
        .upsert({ key: 'custom_background', value: payload });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-accent-cyan" />
            <span>Store Configuration & Custom Background</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure full custom background image overlay, slideshow speed, and payment settings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Custom Background Section */}
        <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand-glow" />
              <h3 className="text-base font-bold text-white">Full Custom Background Image Overlay</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bgEnabled}
                onChange={(e) => setBgEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Background Image Direct URL (ImgBB Hosted)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://i.ibb.co/..."
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
                <ImgBBUploadModal
                  onUploadSuccess={(url) => setBgImageUrl(url)}
                  buttonLabel="Upload Background"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-300 mb-1">
                <span>Overlay Opacity ({Math.round(bgOpacity * 100)}%)</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={bgOpacity}
                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          </div>

        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          {saved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-glow hover:scale-105 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
