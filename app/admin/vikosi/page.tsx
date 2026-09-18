'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Star, 
  Zap, 
  Check, 
  X, 
  Image as ImageIcon, 
  Sparkles, 
  Smartphone, 
  MessageSquare, 
  ArrowUpRight,
  HelpCircle,
  Share2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ImgBBUploadModal from '@/components/ImgBBUploadModal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { 
  EFootballSquad, 
  parseSquadData, 
  generateWhatsAppLink, 
  cleanRedirectUrl 
} from '@/lib/efootball-squads';

export default function AdminVikosiPage() {
  const [squads, setSquads] = useState<EFootballSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<EFootballSquad | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('45000');
  const [coverImage, setCoverImage] = useState('https://i.ibb.co/XZzgkBfx/664335.jpg');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [buttonText, setButtonText] = useState('⚡ NUNUA KIKOSI SASA');
  const [teamStrength, setTeamStrength] = useState('3150+');
  const [boosterCoaches, setBoosterCoaches] = useState('Makocha 6 wenye Booster');
  const [epicsCount, setEpicsCount] = useState('14 Epics / Showtime');
  const [loginType, setLoginType] = useState('Konami ID Safi (Inabadilishwa Email)');
  const [platform, setPlatform] = useState('Mobile (Android & iOS)');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [isSold, setIsSold] = useState(false);
  const [rating, setRating] = useState('4.9');

  const supabase = useMemo(() => createClient(), []);

  // Fetch only squad posts
  const fetchSquads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .ilike('category', '%efootball%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const parsed = data.map((item: any) => parseSquadData(item));
        setSquads(parsed);
      }
    } catch (err) {
      console.error('Failed to fetch squads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSquads();
  }, []);

  // Open modal to add new squad
  const handleOpenAdd = () => {
    setEditingSquad(null);
    setTitle('');
    setPrice('45000');
    setCoverImage('https://i.ibb.co/XZzgkBfx/664335.jpg');
    setScreenshots([]);
    setNewScreenshotUrl('');
    setRedirectUrl(generateWhatsAppLink('255655361060'));
    setButtonText('⚡ NUNUA KIKOSI SASA');
    setTeamStrength('3150+');
    setBoosterCoaches('Makocha 6 wenye Booster');
    setEpicsCount('14 Epics / Showtime');
    setLoginType('Konami ID Safi (Inabadilishwa Email)');
    setPlatform('Mobile (Android & iOS)');
    setDescription('Kikosi kiko tayari. Baada ya kulipia mcheki admin Whatsapp ili ukabidhiwe taarifa za akaunti haraka.');
    setStatus('published');
    setIsSold(false);
    setRating('4.9');
    setModalOpen(true);
  };

  // Open modal to edit existing squad
  const handleOpenEdit = (squad: EFootballSquad) => {
    setEditingSquad(squad);
    setTitle(squad.title);
    setPrice(String(squad.price));
    setCoverImage(squad.cover_image);
    setScreenshots(squad.screenshots || []);
    setNewScreenshotUrl('');
    setRedirectUrl(squad.redirect_url);
    setButtonText(squad.button_text || '⚡ NUNUA KIKOSI SASA');
    setTeamStrength(squad.team_strength || '3150+');
    setBoosterCoaches(squad.booster_coaches || 'Makocha 6 wenye Booster');
    setEpicsCount(squad.epics_count || '14 Epics');
    setLoginType(squad.login_type || 'Konami ID Safi');
    setPlatform(squad.platform || 'Mobile (Android & iOS)');
    setDescription(squad.description || '');
    setStatus(squad.status);
    setIsSold(squad.is_sold);
    setRating(String(squad.rating || 4.9));
    setModalOpen(true);
  };

  // Auto-generate WhatsApp link helper
  const handleGenerateWhatsAppLink = () => {
    const numPrice = Number(price) || 0;
    const link = generateWhatsAppLink('255655361060', title || 'Kikosi cha eFootball', numPrice);
    setRedirectUrl(link);
  };

  // Add extra screenshot
  const handleAddScreenshot = (url?: string) => {
    const targetUrl = (url || newScreenshotUrl).trim();
    if (!targetUrl) return;
    if (!screenshots.includes(targetUrl)) {
      setScreenshots((prev) => [...prev, targetUrl]);
    }
    setNewScreenshotUrl('');
  };

  // Remove screenshot
  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  // Save / Update squad
  const handleSaveSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !coverImage.trim()) {
      alert('Tafadhali jaza Jina la Kikosi na Picha ya Kikosi.');
      return;
    }

    setSubmitting(true);
    try {
      const numPrice = Number(price) || 0;
      const numRating = Number(rating) || 4.8;
      const finalRedirect = cleanRedirectUrl(redirectUrl, title, numPrice);

      // Structure metadata in links[0]
      const linkPayload = [
        {
          name: 'PAYMENT_REDIRECT',
          url: finalRedirect,
          button_text: buttonText.trim() || '⚡ NUNUA KIKOSI SASA',
          team_strength: teamStrength.trim() || '3000+',
          booster_coaches: boosterCoaches.trim() || 'Makocha Wenye Booster',
          epics_count: epicsCount.trim() || 'Epics & Showtime',
          login_type: loginType.trim() || 'Konami ID Safi',
          platform: platform.trim() || 'Mobile (Android & iOS)',
          is_sold: isSold,
          screenshots,
        },
      ];

      const postPayload: any = {
        title: title.trim(),
        price: numPrice,
        category: 'VIKOSI VYA EFOOTBALL',
        description: description.trim(),
        image_url: coverImage.trim(),
        rating: numRating,
        status: isSold ? 'archived' : status,
        links: linkPayload,
        duration_days: 7,
        sort_order: 1,
      };

      if (editingSquad?.id) {
        // Update
        const { error } = await supabase
          .from('posts')
          .update(postPayload)
          .eq('id', editingSquad.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('posts')
          .insert(postPayload);

        if (error) throw error;
      }

      // Broadcast changes for zero reload update
      try {
        await fetch('/api/admin/health?action=broadcast', { method: 'POST' }).catch(() => {});
      } catch {}

      setModalOpen(false);
      await fetchSquads();
    } catch (err: any) {
      console.error('Error saving squad:', err);
      alert('Hitilafu wakati wa kuhifadhi: ' + (err.message || 'Jaribu tena'));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Sold Out status
  const handleToggleSold = async (squad: EFootballSquad) => {
    setActionLoadingId(squad.id);
    try {
      const nextSold = !squad.is_sold;
      const updatedLinks = Array.isArray(squad.raw_links) && squad.raw_links.length > 0 
        ? [...squad.raw_links]
        : [{ name: 'PAYMENT_REDIRECT', url: squad.redirect_url }];

      updatedLinks[0] = {
        ...updatedLinks[0],
        is_sold: nextSold,
        button_text: nextSold ? 'KIKOSI KIMEKWISHA (SOLD OUT)' : '⚡ NUNUA KIKOSI SASA',
      };

      const { error } = await supabase
        .from('posts')
        .update({
          status: nextSold ? 'archived' : 'published',
          links: updatedLinks,
        })
        .eq('id', squad.id);

      if (error) throw error;
      await fetchSquads();
    } catch (err: any) {
      console.error('Error toggling sold status:', err);
      alert('Hitilafu: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete squad
  const handleDeleteSquad = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta kikosi hiki? Hatua hii haiwezi kurudishwa.')) {
      return;
    }

    setActionLoadingId(id);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSquads();
    } catch (err: any) {
      console.error('Error deleting squad:', err);
      alert('Hitilafu wakati wa kufuta: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered squads
  const filteredSquads = useMemo(() => {
    return squads.filter((s) => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.team_strength.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (filterStatus === 'AVAILABLE') return !s.is_sold && s.status === 'published';
      if (filterStatus === 'SOLD') return s.is_sold || s.status === 'archived';
      return true;
    });
  }, [squads, search, filterStatus]);

  // Statistics
  const totalCount = squads.length;
  const availableCount = squads.filter(s => !s.is_sold && s.status === 'published').length;
  const soldCount = squads.filter(s => s.is_sold || s.status === 'archived').length;
  const totalValue = squads.reduce((sum, s) => sum + (s.price || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                eFootball 2026 HQ
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
              Usimamizi wa Vikosi vya eFootball
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tengeneza, rekebisha na simamia post za vikosi vya eFootball kwa picha full na direct link za kulipia.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Ongeza Kikosi Kipya</span>
        </button>
      </div>

      {/* Summary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumla ya Vikosi</span>
          <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-md">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Vinavyopatikana</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{availableCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-md">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Vilivyouzwa (Sold)</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{soldCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-md">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Thamani Yote</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{formatCurrency(totalValue)}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tafuta kikosi kwa jina au strength..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
              filterStatus === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Zote ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('AVAILABLE')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
              filterStatus === 'AVAILABLE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Vinavyopatikana ({availableCount})
          </button>
          <button
            onClick={() => setFilterStatus('SOLD')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
              filterStatus === 'SOLD'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Vilivyouzwa ({soldCount})
          </button>
        </div>
      </div>

      {/* Squad Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
          <span className="text-xs font-bold uppercase">Inapakia vikosi vya eFootball...</span>
        </div>
      ) : filteredSquads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSquads.map((squad) => (
            <div
              key={squad.id}
              className={`flex flex-col justify-between rounded-3xl overflow-hidden bg-slate-900 border transition-all ${
                squad.is_sold
                  ? 'border-rose-500/30 opacity-80'
                  : 'border-slate-800 hover:border-blue-500/50 shadow-xl'
              }`}
            >
              {/* Card Top: Full Uncropped Squad Preview with Pitch Backdrop */}
              <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#0a192f] via-[#051124] to-[#020b18] p-2 flex items-center justify-center border-b border-slate-800/80 overflow-hidden group">
                <Image
                  src={squad.cover_image}
                  alt={squad.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/40 shadow-md">
                    ⚡ {squad.team_strength || '3150+'}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider backdrop-blur-md border shadow-md ${
                      squad.is_sold
                        ? 'bg-rose-500/90 text-white border-rose-400/40'
                        : 'bg-emerald-500/90 text-white border-emerald-400/40'
                    }`}
                  >
                    {squad.is_sold ? 'SOLD OUT' : 'INAPATIKANA'}
                  </span>
                </div>

                {/* Uncropped watermark indicator */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[8px] font-black text-slate-300 border border-white/10 uppercase tracking-widest pointer-events-none">
                  Picha Kamili (Full View)
                </div>
              </div>

              {/* Card Content & Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      {squad.platform}
                    </span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {squad.rating}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 leading-snug">
                    {squad.title}
                  </h3>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-300 pt-1">
                    <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 truncate" title={squad.booster_coaches}>
                      🛡️ {squad.booster_coaches}
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 truncate" title={squad.login_type}>
                      🔐 {squad.login_type}
                    </div>
                  </div>

                  {squad.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                      {squad.description}
                    </p>
                  )}
                </div>

                {/* Price & Redirect Link Preview */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">BEI YA KIKOSI</span>
                      <span className="text-base font-black text-emerald-400">{formatCurrency(squad.price)}</span>
                    </div>

                    <a
                      href={squad.redirect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold transition-colors"
                      title="Jaribu link ya kudirect"
                    >
                      <span>Jaribu Link</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Toggle Sold/Available */}
                    <button
                      type="button"
                      onClick={() => handleToggleSold(squad)}
                      disabled={actionLoadingId === squad.id}
                      className={`min-h-[40px] px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                        squad.is_sold
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                      }`}
                      title={squad.is_sold ? 'Weka Inapatikana tena' : 'Weka Kimeuzwa'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{squad.is_sold ? 'Weka Kipo' : 'Sold Out'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(squad)}
                      className="min-h-[40px] px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Hariri</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSquad(squad.id)}
                      disabled={actionLoadingId === squad.id}
                      className="min-h-[40px] px-2 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Futa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Hakuna Kikosi Kilichopatikana
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Bofya kitufe cha juu &quot;Ongeza Kikosi Kipya&quot; ili kuanza kupakia vikosi vya eFootball vyenye picha kamili na direct link.
            </p>
          </div>
        </div>
      )}

      {/* Add / Edit Squad Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0F172A] border border-slate-800 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-tight">
                    {editingSquad ? 'Hariri Kikosi cha eFootball' : 'Ongeza Kikosi Kipya cha eFootball'}
                  </h2>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                    Picha Full Bila Kukatwa • Direct Redirect Link
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleSaveSquad} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Taarifa za Msingi</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Jina la Kikosi *</label>
                    <input
                      type="text"
                      required
                      placeholder="k.m. NUNUA KIKOSI CHA EFOOTBALL 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Bei (TSh) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="45000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Squad Formation Image & Live Uncropped Preview */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider">
                    2. Picha Kuu ya Kikosi (Formation Image)
                  </h3>
                  <ImgBBUploadModal
                    buttonLabel="Pakia Picha (ImgBB)"
                    onUploadSuccess={(url) => setCoverImage(url)}
                    className="text-[11px] py-1.5 px-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://i.ibb.co/... au link ya picha ya kikosi"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Picha hii itaonyeshwa <strong>FULL bila kukatwa</strong> ili wachezaji wote na booster stats zionekane vizuri.
                  </p>
                </div>

                {/* Live Uncropped Preview Box */}
                {coverImage && (
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      Muonekano Kamili Usiokatwa (Live Uncropped Preview):
                    </span>
                    <div className="relative w-full h-64 sm:h-80 bg-[#051124] rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80">
                      <Image
                        src={coverImage}
                        alt="Squad Formation Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Redirect Link & CTA Button */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider">
                    3. Batan ya Kulipia & Link ya Kudirect
                  </h3>
                  <button
                    type="button"
                    onClick={handleGenerateWhatsAppLink}
                    className="inline-flex items-center gap-1 text-[11px] py-1 px-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-bold transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Tengeneza WhatsApp Link Papo Hapo</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                      Link ya Kudirect (WhatsApp Link au Payment Gateway) *
                    </label>
                    <div className="relative">
                      <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="https://wa.me/255655361060?text=... au link ya malipo"
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Mteja akibofya kitufe cha kulipia kwenye kadi ya kikosi au ukurasa wa ndani, atapelekwa moja kwa moja kwenye link hii.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                      Maandishi ya Batan (Button CTA Text)
                    </label>
                    <input
                      type="text"
                      placeholder="⚡ NUNUA KIKOSI SASA"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Squad Specifications */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider">
                  4. Sifa Maalum za Kikosi cha eFootball
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Team Strength</label>
                    <input
                      type="text"
                      placeholder="k.m. 3150+ au 3200+"
                      value={teamStrength}
                      onChange={(e) => setTeamStrength(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Makocha wenye Booster</label>
                    <input
                      type="text"
                      placeholder="k.m. Makocha 6 wenye Booster"
                      value={boosterCoaches}
                      onChange={(e) => setBoosterCoaches(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Wachezaji wa Epics / Showtime</label>
                    <input
                      type="text"
                      placeholder="k.m. 14 Epics & Showtime"
                      value={epicsCount}
                      onChange={(e) => setEpicsCount(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Aina ya Akaunti (Login)</label>
                    <input
                      type="text"
                      placeholder="k.m. Konami ID Safi (Inabadilishwa Email)"
                      value={loginType}
                      onChange={(e) => setLoginType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Jukwaa (Platform)</label>
                    <input
                      type="text"
                      placeholder="Mobile (Android & iOS)"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Rating (Nyota)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      placeholder="4.9"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">Maelezo ya Ziada (Description)</label>
                  <textarea
                    rows={3}
                    placeholder="Weka maelezo ya kikosi na maelekezo ya kupokea akaunti baada ya kulipia..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Extra Screenshots Gallery */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Picha za Ziada / Benchi / Akiba (Screenshots)
                  </label>
                  <ImgBBUploadModal
                    buttonLabel="Pakia Picha ya Ziada"
                    onUploadSuccess={(url) => handleAddScreenshot(url)}
                    className="text-[10px] py-1 px-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Weka link ya screenshot..."
                    value={newScreenshotUrl}
                    onChange={(e) => setNewScreenshotUrl(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddScreenshot()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                  >
                    Ongeza
                  </button>
                </div>

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {screenshots.map((shot, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group">
                        <Image src={shot} alt={`Screenshot ${idx + 1}`} fill className="object-contain" />
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status & Availability Toggle */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-bold text-slate-300 uppercase block">
                  Hali ya Kikosi (Status)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSold(false)}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      !isSold
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Inapatikana (Available)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSold(true)}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSold
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Kimeuzwa (Sold Out)</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold uppercase hover:bg-slate-700 transition-colors"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  <span>{editingSquad ? 'Hifadhi Mabadiliko' : 'Chapisha Kikosi Sasa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
