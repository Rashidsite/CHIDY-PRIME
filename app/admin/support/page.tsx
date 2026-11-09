'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Video,
  Share2,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Zap,
  Gamepad2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Check,
  AlertCircle,
  Eye,
  Info
} from 'lucide-react';
import {
  DEFAULT_SUPPORT_CONFIG,
  SupportConfig,
  SupportVideoItem,
  SupportSocialLink,
  SupportFeatureItem,
  getYouTubeEmbedUrl,
} from '@/lib/supportDefaults';

const AVAILABLE_ICONS = [
  'Zap',
  'Gamepad2',
  'ShieldCheck',
  'MessageCircle',
  'Headphones',
  'Clock',
  'CheckCircle2',
  'Sparkles',
];

const PLATFORMS: Array<SupportSocialLink['platform']> = [
  'youtube',
  'instagram',
  'tiktok',
  'telegram',
  'whatsapp',
  'twitter',
  'other',
];

export default function AdminSupportPage() {
  const [config, setConfig] = useState<SupportConfig>(DEFAULT_SUPPORT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'videos' | 'whatsapp_gate' | 'social' | 'features'>('general');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/support');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          ...DEFAULT_SUPPORT_CONFIG,
          ...data.config,
        });
      }
    } catch (err) {
      console.error('Failed to load support config:', err);
      showToast('Imeshindwa kupakia mipangilio ya msaada', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Mipangilio ya Dawati la Msaada imehifadhiwa vizuri!');
      } else {
        showToast(data.error || 'Imeshindikana kuhifadhi', 'error');
      }
    } catch (err: any) {
      console.error('Failed to save config:', err);
      showToast('Kuna hitilafu ya mtandao wakati wa kuhifadhi', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Video Management
  const addVideo = () => {
    const newVideo: SupportVideoItem = {
      id: `vid-${Date.now()}`,
      title: 'Video Mpya ya Muongozo',
      youtube_url: '',
      description: 'Maelezo mafupi kuhusu mchezo huu au hatua za kufuata.',
      is_active: true,
      order: config.videos.length + 1,
    };
    setConfig((prev) => ({
      ...prev,
      videos: [...prev.videos, newVideo],
    }));
  };

  const removeVideo = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.id !== id),
    }));
  };

  const updateVideo = (id: string, field: keyof SupportVideoItem, value: any) => {
    setConfig((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    }));
  };

  // Social Links Management
  const addSocialLink = () => {
    const newLink: SupportSocialLink = {
      id: `soc-${Date.now()}`,
      platform: 'youtube',
      label: 'Channel / Ukurasa Mpya',
      url: 'https://',
      is_active: true,
    };
    setConfig((prev) => ({
      ...prev,
      social_links: [...prev.social_links, newLink],
    }));
  };

  const removeSocialLink = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((s) => s.id !== id),
    }));
  };

  const updateSocialLink = (id: string, field: keyof SupportSocialLink, value: any) => {
    setConfig((prev) => ({
      ...prev,
      social_links: prev.social_links.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  // Features Management
  const addFeature = () => {
    const newFeature: SupportFeatureItem = {
      id: `f-${Date.now()}`,
      icon: 'Zap',
      title: 'Kipengele Kipya',
      description: 'Maelezo mafupi ya huduma au msaada unaotolewa hapa.',
      is_active: true,
    };
    setConfig((prev) => ({
      ...prev,
      features: [...prev.features, newFeature],
    }));
  };

  const removeFeature = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.filter((f) => f.id !== id),
    }));
  };

  const updateFeature = (id: string, field: keyof SupportFeatureItem, value: any) => {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs uppercase font-bold tracking-widest font-mono">Inapakia Mipangilio ya Msaada...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-900/30'
                : 'bg-rose-950/90 border-rose-500/60 text-rose-200 shadow-rose-900/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                Support Desk CMS
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Live Editor
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Simamia video za mafunzo, WhatsApp gate (sharti la kulipia), na maelezo ya ukurasa wa msaada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/support"
            target="_blank"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
            title="Angalia ukurasa wa live"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Tazama Live</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Inahifadhi...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Hifadhi Mabadiliko</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'general', label: 'Maelezo ya Ukurasa', icon: Info },
          { id: 'videos', label: `Video za Muongozo (${config.videos.length})`, icon: Video },
          { id: 'whatsapp_gate', label: 'WhatsApp & Sharti la Malipo', icon: ShieldAlert },
          { id: 'social', label: `Mitandao ya Kijamii (${config.social_links.length})`, icon: Share2 },
          { id: 'features', label: `Vipengele (${config.features.length})`, icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL HEADERS */}
      {activeTab === 'general' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Maelezo Makuu ya Ukurasa</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kichwa cha ukurasa na maneno ya kumkaribisha mteja kwenye dawati la msaada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Kichwa Kikuu (Page Title)</label>
              <input
                type="text"
                value={config.page_title}
                onChange={(e) => setConfig({ ...config, page_title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 uppercase"
                placeholder="DAWATI LA MSAADA"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Kichwa Kidogo (Page Subtitle)</label>
              <input
                type="text"
                value={config.page_subtitle}
                onChange={(e) => setConfig({ ...config, page_subtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                placeholder="ChidyPrime × ChidyGaming • Official Help Desk"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Maelezo ya Kukaribisha (Welcome Message)</label>
            <textarea
              rows={3}
              value={config.welcome_text}
              onChange={(e) => setConfig({ ...config, welcome_text: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
              placeholder="Karibu sana gamer! Naitwa Chidy..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Ujumbe wa Kijani Unaong'aa (Welcome Highlight)</label>
            <input
              type="text"
              value={config.welcome_highlight}
              onChange={(e) => setConfig({ ...config, welcome_highlight: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-blue-500"
              placeholder="💬 Nitazungumza nawe moja kwa moja WhatsApp..."
            />
          </div>
        </div>
      )}

      {/* TAB 2: VIDEOS SECTION */}
      {activeTab === 'videos' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Video za Muongozo (YouTube Embeds)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Video hizi zitaonekana moja kwa moja juu ya kitufe cha WhatsApp ili mteja ajifunze kwanza kabla ya kuanza kuuliza maswali.
              </p>
            </div>

            <button
              onClick={addVideo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ongeza Video</span>
            </button>
          </div>

          {config.videos.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
              <Video className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Hakuna video zilizowekwa bado. Bonyeza "Ongeza Video" kuweka video ya kwanza.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {config.videos.map((vid, index) => {
                const embedUrl = getYouTubeEmbedUrl(vid.youtube_url);
                return (
                  <div
                    key={vid.id}
                    className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {vid.title || 'Video Isiyo na Kichwa'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vid.is_active}
                            onChange={(e) => updateVideo(vid.id, 'is_active', e.target.checked)}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span>Ionekane Live</span>
                        </label>

                        <button
                          onClick={() => removeVideo(vid.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Futa video hii"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Inputs */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">Jina la Video</label>
                          <input
                            type="text"
                            value={vid.title}
                            onChange={(e) => updateVideo(vid.id, 'title', e.target.value)}
                            placeholder="Mfano: Namna ya kuweka game kwenye simu"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">
                            Link ya YouTube (Watch au Embed URL)
                          </label>
                          <input
                            type="text"
                            value={vid.youtube_url}
                            onChange={(e) => updateVideo(vid.id, 'youtube_url', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=... au youtu.be/..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">Maelezo Mafupi</label>
                          <textarea
                            rows={2}
                            value={vid.description}
                            onChange={(e) => updateVideo(vid.id, 'description', e.target.value)}
                            placeholder="Maelekezo mafupi yatakayoonekana chini ya video..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Right: Live Preview */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
                          <span>Hakikisho la Video (Live Preview)</span>
                          {embedUrl && (
                            <span className="text-[10px] text-emerald-400 font-normal">URL Imetambuliwa vizuri</span>
                          )}
                        </label>
                        <div className="aspect-video w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                          {embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title={vid.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                              <Video className="w-6 h-6 text-slate-600" />
                              <span>Weka YouTube URL kuona video hapa</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHATSAPP GATE & UNPAID CHECK */}
      {activeTab === 'whatsapp_gate' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                WhatsApp Desk & Sharti la Malipo (Gatekeeper)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kitufe cha WhatsApp kitaruhusu wateja waliolipa tu kufungua chat. Wasiolipa watapata ujumbe maalum wa kuwaelekeza kulipia game kwanza.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Namba ya WhatsApp (Format ya Kimataifa, e.g. 255655361060)</label>
              <input
                type="text"
                value={config.whatsapp_number}
                onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                placeholder="255655361060"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Ujumbe wa Kuanzia WhatsApp (Default Pre-filled Text)</label>
              <input
                type="text"
                value={config.whatsapp_message}
                onChange={(e) => setConfig({ ...config, whatsapp_message: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Habari Chidy, nahitaji msaada..."
              />
            </div>
          </div>

          {/* Unpaid Warning Box Settings */}
          <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Ujumbe kwa Mteja Ambaye Hajanunua Game Bado
              </h4>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">Kichwa cha Onyo (Warning Title)</label>
                <input
                  type="text"
                  value={config.unpaid_warning_title}
                  onChange={(e) => setConfig({ ...config, unpaid_warning_title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  placeholder="⚠️ Lipia Game Kwanza!"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">Ujumbe Kamili wa Maelekezo (Warning Message)</label>
                <textarea
                  rows={3}
                  value={config.unpaid_warning_message}
                  onChange={(e) => setConfig({ ...config, unpaid_warning_message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-amber-500 leading-relaxed"
                  placeholder="Samahani! Ili kupata msaada wa WhatsApp, unahitaji kuwa na angalau oda moja iliyolipwa..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOCIAL LINKS */}
      {activeTab === 'social' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>Mitandao ya Kijamii (Social Links Pills)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pills za mitandao zitakazotokea chini ya kitufe cha WhatsApp (YouTube, Telegram, Instagram, TikTok n.k.).
              </p>
            </div>

            <button
              onClick={addSocialLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ongeza Mtandao</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.social_links.map((link) => (
              <div
                key={link.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(link.id, 'platform', e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-bold uppercase focus:outline-none focus:border-blue-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={link.is_active}
                        onChange={(e) => updateSocialLink(link.id, 'is_active', e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Active</span>
                    </label>

                    <button
                      onClick={() => removeSocialLink(link.id)}
                      className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateSocialLink(link.id, 'label', e.target.value)}
                    placeholder="Jina la kuonekana (e.g. YouTube Channel)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                    placeholder="URL (e.g. https://youtube.com/@chidyprime)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FEATURES LIST */}
      {activeTab === 'features' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Kadi za Vipengele vya Huduma (Features Cards)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kadi 3 za faida zinazowashawishi wateja kuona huduma ni za kuaminika (Majibu ya Haraka, Msaada wa Kuset n.k.).
              </p>
            </div>

            <button
              onClick={addFeature}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ongeza Kadi</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.features.map((feat) => (
              <div
                key={feat.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <select
                    value={feat.icon}
                    onChange={(e) => updateFeature(feat.id, 'icon', e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-cyan-400 font-bold focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_ICONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feat.is_active}
                        onChange={(e) => updateFeature(feat.id, 'is_active', e.target.checked)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Active</span>
                    </label>

                    <button
                      onClick={() => removeFeature(feat.id)}
                      className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={feat.title}
                    onChange={(e) => updateFeature(feat.id, 'title', e.target.value)}
                    placeholder="Kichwa (e.g. Majibu ya Haraka)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={2}
                    value={feat.description}
                    onChange={(e) => updateFeature(feat.id, 'description', e.target.value)}
                    placeholder="Maelezo..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
