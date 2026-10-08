'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { 
  Headphones, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Gamepad2, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  Youtube, 
  MessageCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  CreditCard,
  Loader2,
  Lock,
  Phone,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'chidy' | 'user';
  text: string;
  timestamp: string;
  type?: 'text' | 'verified_order' | 'game_cards' | 'recommendations' | 'tutorial_video' | 'general_tutorial' | 'warning' | 'lockout' | 'need_phone';
  order?: {
    id: string;
    gameTitle: string;
    coverImage?: string | null;
    amount: number | string;
    downloadLinks: Array<{ name?: string; url?: string; title?: string }>;
    installGuide?: string;
    videoUrl?: string | null;
  };
  games?: Array<{
    id: string;
    title: string;
    category?: string;
    price: number | string;
    cover_image?: string;
    description?: string;
    customNote?: string;
  }>;
  tutorial?: {
    title: string;
    videoUrl: string;
    instructions?: string;
  };
  channelUrl?: string;
  quickActions?: Array<{ label: string; query: string }>;
}

const STORAGE_KEY = 'cpcg_support_chat_v2';
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours
const TWO_DAYS_MS = 48 * 60 * 60 * 1000; // 48 hours

export default function SupportPage() {
  const [bgSettings, setBgSettings] = useState<{
    enabled: boolean;
    image_url: string;
    opacity: number;
  }>({
    enabled: true,
    image_url: '/game_controller_bg.jpg',
    opacity: 0.45,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unpaidAttempts, setUnpaidAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockRemainingSecs, setLockRemainingSecs] = useState<number>(0);
  const [userPhone, setUserPhone] = useState('');

  // Payment Modal State
  const [paymentModalGame, setPaymentModalGame] = useState<any | null>(null);
  const [payPhone, setPayPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payStatusText, setPayStatusText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Play audio chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Lock window & document scroll so Support Page is 100% self-contained app
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  // ── INITIAL LOAD & LOCAL STORAGE RESTORE ──
  useEffect(() => {
    async function loadBgSettings() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'custom_background')
          .maybeSingle();
        if (data?.value) {
          setBgSettings({
            enabled: data.value.enabled ?? true,
            image_url: data.value.image_url || '/game_controller_bg.jpg',
            opacity: data.value.opacity ?? 0.45,
          });
        }
      } catch (err) {
        console.warn('Background settings warning:', err);
      }
    }
    loadBgSettings();

    // Check saved chat session
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const age = now - (parsed.createdAt || now);

        // Expire after 48 hours (siku 2)
        if (age >= TWO_DAYS_MS) {
          localStorage.removeItem(STORAGE_KEY);
          initWelcomeChat();
          return;
        }

        // Restore chat if within 24h
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
          setUnpaidAttempts(parsed.unpaidAttempts || 0);
          setUserPhone(parsed.userPhone || '');

          if (parsed.lockedUntil && parsed.lockedUntil > now) {
            setLockedUntil(parsed.lockedUntil);
            setLockRemainingSecs(Math.ceil((parsed.lockedUntil - now) / 1000));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not restore chat history:', e);
    }

    initWelcomeChat();
  }, [supabase]);

  // Save to localStorage whenever messages or attempts change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : null;
      const createdAt = parsed?.createdAt || Date.now();

      const payload = {
        createdAt,
        lastUpdated: Date.now(),
        messages,
        unpaidAttempts,
        lockedUntil,
        userPhone,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [messages, unpaidAttempts, lockedUntil, userPhone]);

  // Lockout Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const diff = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockedUntil(null);
        setLockRemainingSecs(0);
        setUnpaidAttempts(0);
        clearInterval(interval);
      } else {
        setLockRemainingSecs(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isTyping]);

  const initWelcomeChat = () => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome_' + Date.now(),
      sender: 'chidy',
      text: 'Oya gamer! Karibu sana HQ ya ChidyPrime x ChidyGaming 🎮 Naitwa Chidy, nipo hapa kuhakikisha unacheza bila chenga. Niambie kaka, umekwama wapi au unahitaji mchongo gani leo?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickActions: [
        { label: '🚀 Nimelipa sijapata game', query: 'Nimelipa sijapata game' },
        { label: '🇹🇿 Mabasi ya Tanzania', query: 'Nataka game la mabasi ya Tanzania' },
        { label: '⚽ Michezo ya Mpira', query: 'Nataka game la mpira' },
        { label: '📺 Jinsi ya Ku-set game', query: 'Nielekeze jinsi ya kuset game' },
        { label: '💬 Ongea WhatsApp', query: 'whatsapp' },
      ],
    };
    setMessages([welcomeMsg]);
    setTimeout(() => playChime(), 500);
  };

  // Reset chat memory
  const handleResetChat = () => {
    if (confirm('Je, una uhakika unataka kusafisha kumbukumbu ya chat na kuanza upya?')) {
      localStorage.removeItem(STORAGE_KEY);
      setLockedUntil(null);
      setUnpaidAttempts(0);
      initWelcomeChat();
    }
  };

  // Send message to Assistant API
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isTyping) return;

    if (lockedUntil && Date.now() < lockedUntil) {
      alert('Dawati la msaada limefungwa kwa muda. Tafadhali subiri muda uliowekwa umalizike.');
      return;
    }

    // Direct WhatsApp escape
    if (textToSend.toLowerCase() === 'whatsapp') {
      window.open('https://wa.me/255655361060?text=Habari%20Chidy,%20nahitaji%20msaada%20wa%20huduma%20ya%20games...', '_blank');
      return;
    }

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/support/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          phone: userPhone,
          unpaidAttempts,
        }),
      });

      const data = await res.json();
      setIsTyping(false);
      playChime();

      if (data.type === 'lockout' || data.isLocked) {
        const lockoutMs = (data.lockoutMinutes || 60) * 60 * 1000;
        const lockTarget = Date.now() + lockoutMs;
        setLockedUntil(lockTarget);
        setLockRemainingSecs(Math.ceil(lockoutMs / 1000));
        setUnpaidAttempts(data.unpaidAttempts || 5);

        const lockMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          sender: 'chidy',
          text: data.message,
          type: 'lockout',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, lockMsg]);
        return;
      }

      if (data.unpaidAttempts !== undefined) {
        setUnpaidAttempts(data.unpaidAttempts);
      }

      const botReply: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'chidy',
        text: data.message || 'Nimekupata kaka!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: data.type,
        order: data.order,
        games: data.games || (data.allFeatured ? data.allFeatured : undefined),
        tutorial: data.tutorial,
        channelUrl: data.channelUrl,
        quickActions: data.quickActions,
      };

      setMessages(prev => [...prev, botReply]);

    } catch (err) {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        id: 'bot_err_' + Date.now(),
        sender: 'chidy',
        text: 'Mtandao umesumbua kidogo kaka. Hebu jaribu tena au gusa kitufe cha WhatsApp chini tuwasiliane moja kwa moja.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Trigger in-chat payment
  const handleOpenPayment = (game: any) => {
    setPaymentModalGame(game);
    setPayPhone(userPhone || '');
    setPayStatusText('');
  };

  const handleExecutePayment = async () => {
    if (!payPhone || payPhone.length < 9) {
      alert('Tafadhali ingiza namba sahihi ya simu ya kulipia!');
      return;
    }

    setIsPaying(true);
    setPayStatusText('Inatuma namba ya siri (STK Push) kwenye simu yako...');
    setUserPhone(payPhone);

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: paymentModalGame.id,
          visitor_phone: payPhone,
          customer_name: 'Mteja wa Chidy Support',
          payment_gateway: 'pressopay',
        }),
      });

      const data = await res.json();
      if (!data.success && data.error) {
        alert(data.error || 'Imeshindwa kutuma ombi la malipo');
        setIsPaying(false);
        return;
      }

      setPayStatusText('Ombi la STK Push limetumwa! Tafadhali weka namba yako ya siri kwenye simu.');

      // Notify in chat
      const notifMsg: ChatMessage = {
        id: 'bot_pay_' + Date.now(),
        sender: 'chidy',
        text: `Nimetuma STK Push ya TSh ${Number(paymentModalGame.price).toLocaleString()} kwenye simu yako (${payPhone}) kwa ajili ya game la "${paymentModalGame.title}". Weka PIN yako sasa kisha ubonyeze kitufe cha "Nimelipa" hapa chini nikutumie link mara moja! 🔥`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickActions: [
          { label: '✅ Tayari Nimelipa (Thibitisha Sasa)', query: `Nimelipa ${payPhone}` },
          { label: '💬 Msaada WhatsApp', query: 'whatsapp' },
        ],
      };
      setMessages(prev => [...prev, notifMsg]);
      setPaymentModalGame(null);
      setIsPaying(false);

    } catch (err: any) {
      alert(err.message || 'Hitilafu ya malipo');
      setIsPaying(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar />

      <main className="fixed inset-x-0 top-16 bottom-[58px] md:bottom-2 z-20 flex flex-col overflow-hidden max-w-4xl mx-auto px-2 sm:px-4 py-1 sm:py-2">
        <div className="w-full h-full flex flex-col rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden">
          
          {/* ── GAMING HUD CHAT HEADER (compact & docked inside card) ── */}
          <div className="shrink-0 p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Chidy Avatar with Pulsing Online Dot */}
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center overflow-hidden">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                    CHIDY SUPPORT <span className="text-cyan-400 font-mono">HQ</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    🟢 Hewani 24/7
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Msaidizi rasmi wa <strong className="text-slate-200">ChidyPrime x ChidyGaming</strong>
                </p>
              </div>
            </div>

            {/* Controls: Sound & Clear */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={soundEnabled ? 'Zima Sauti' : 'Washa Sauti'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>

              <button
                onClick={handleResetChat}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Safisha kumbukumbu ya chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SECURITY LOCKOUT BANNER (if user is locked out) ── */}
          {lockedUntil && (
            <div className="shrink-0 p-3 sm:p-4 bg-red-950/90 border-b border-red-500/40 text-center space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-black text-white uppercase tracking-tight">
                <Lock className="w-4 h-4 text-red-400 animate-pulse" />
                <span>⛔ Dawati la Msaada Limefungwa kwa Muda</span>
              </div>
              <p className="text-[11px] text-red-200 max-w-lg mx-auto font-medium">
                Umejaribu kudai malipo mara nyingi bila uthibitisho. Sehemu hii imefungwa kwa ajili ya usalama.
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-red-500/30 text-red-400 font-mono font-bold text-xs">
                  Muda: {formatTimer(lockRemainingSecs)}
                </span>
                <a
                  href="https://wa.me/255655361060?text=Habari%20Admin,%20namba%20yangu%20imefungwa%20kwenye%20support.%20Huu%20hapa%20ushahidi%20wangu%20wa%20malipo..."
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
                >
                  WhatsApp Risiti
                </a>
              </div>
            </div>
          )}

          {/* ── MESSAGES SCROLL AREA (Only messages scroll) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5">
            
            {/* Retention Notice */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-[10px] text-slate-400 border border-slate-700/60 font-mono">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Kumbukumbu ya chat na link za games zinahifadhiwa kwa saa 24</span>
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Avatar */}
                {msg.sender === 'chidy' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-cyan-400 flex items-center justify-center shrink-0 self-start shadow-md mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Body */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 sm:p-3.5 rounded-2xl rounded-tr-none shadow-lg'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 p-3 sm:p-4 rounded-2xl rounded-tl-none shadow-md'
                }`}>
                  
                  {/* Sender Name & Time */}
                  <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono pb-1 border-b border-white/10">
                    <span className="font-bold text-slate-300">
                      {msg.sender === 'chidy' ? 'Chidy (Admin & Gamer)' : 'Wewe'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Main Text */}
                  <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                    {msg.text}
                  </p>

                  {/* ── CARD: VERIFIED ORDER & 24H DOWNLOAD LINKS ── */}
                  {msg.order && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Malipo Yamethibitishwa: {msg.order.gameTitle}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                        <span>Link hizi zinafanya kazi ndani ya <strong>masaa 24</strong> kuanzia sasa!</span>
                      </div>

                      {/* Download Buttons */}
                      <div className="space-y-1.5 pt-1">
                        {msg.order.downloadLinks && msg.order.downloadLinks.length > 0 ? (
                          msg.order.downloadLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-between shadow-md transition-all cursor-pointer"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Download className="w-4 h-4 shrink-0" />
                                <span className="truncate">{link.name || link.title || `Pakua Game Part ${idx + 1}`}</span>
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            </a>
                          ))
                        ) : (
                          <div className="text-[11px] text-amber-400">
                            Download link inatengenezwa. Kama haijatokea gusa kitufe cha WhatsApp chini tukutumie papo hapo!
                          </div>
                        )}
                      </div>

                      {/* Installation Guide */}
                      {msg.order.installGuide && (
                        <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800 space-y-1">
                          <span className="font-bold text-cyan-400 uppercase tracking-wide text-[10px]">Maelekezo ya Ku-set:</span>
                          <p className="italic">{msg.order.installGuide}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CARD: GAME RECOMMENDATIONS / PRIORITY CARDS WITH IN-CHAT BUY ── */}
                  {msg.games && msg.games.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 pt-1">
                      {msg.games.map((g) => (
                        <div
                          key={g.id}
                          className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex gap-3 items-center justify-between group hover:border-blue-500/50 transition-all shadow-md"
                        >
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                            {g.cover_image ? (
                              <Image src={g.cover_image} alt={g.title} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Gamepad2 className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h4 className="text-xs font-black text-white truncate">{g.title}</h4>
                            <p className="text-[11px] font-bold text-cyan-400">
                              TSh {Number(g.price || 0).toLocaleString()}
                            </p>
                            {g.customNote && (
                              <p className="text-[10px] text-slate-400 italic truncate">
                                {g.customNote}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleOpenPayment(g)}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md shrink-0 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Lipia Sasa</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── CARD: TUTORIAL VIDEO ── */}
                  {msg.tutorial && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-red-500/30 space-y-2.5 shadow-md">
                      <div className="flex items-center gap-2 text-red-400 font-black text-xs">
                        <Youtube className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{msg.tutorial.title}</span>
                      </div>

                      <a
                        href={msg.tutorial.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Youtube className="w-4 h-4 fill-white" />
                        <span>Tazama Video Kamili YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>

                      {msg.tutorial.instructions && (
                        <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                          {msg.tutorial.instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── CARD: GENERAL CHANNEL FALLBACK ── */}
                  {msg.channelUrl && (
                    <div className="mt-3 pt-2 border-t border-slate-800">
                      <a
                        href={msg.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Youtube className="w-4 h-4" />
                        <span>Fungua YouTube Channel ya ChidyGaming</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Quick Action Chips inside bot message */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                      {msg.quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(qa.query)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-400 font-mono ml-1">Chidy anaandika...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── CHAT INPUT FOOTER ── */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
            
            {/* Quick Action Chips bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-nowrap">
              <button
                onClick={() => handleSendMessage('Nimelipa sijapata game')}
                className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
              >
                🚀 Nimelipa Sijapata Game
              </button>
              <button
                onClick={() => handleSendMessage('Nataka game')}
                className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
              >
                🎮 Games Kali za Kipaumbele
              </button>
              <button
                onClick={() => handleSendMessage('Nataka game la mabasi ya Tanzania')}
                className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
              >
                🇹🇿 Mabasi ya Tanzania
              </button>
              <button
                onClick={() => handleSendMessage('Nielekeze jinsi ya kuset game')}
                className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
              >
                📺 Jinsi ya Ku-set / Install
              </button>
              <a
                href="https://wa.me/255655361060?text=Habari%20Chidy,%20nahitaji%20msaada%20wa..."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                <span>WhatsApp Admin</span>
              </a>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                disabled={!!lockedUntil || isTyping}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lockedUntil ? 'Dawati limefungwa kwa muda...' : 'Andika ujumbe wako hapa (mfano: namba ya simu, jina la game, vp, niaje)...'}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none transition-all placeholder:text-slate-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || !!lockedUntil || isTyping}
                className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Tuma</span>
              </button>
            </form>
          </div>
        </div>

        {/* ── IN-CHAT PAYMENT MODAL / DRAWER ── */}
        {paymentModalGame && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      Lipiа Game Hapa Hapa
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{paymentModalGame.title}</p>
                  </div>
                </div>

                <button
                  onClick={() => setPaymentModalGame(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase">Bei ya Game:</span>
                <span className="text-base font-black text-cyan-400">
                  TSh {Number(paymentModalGame.price).toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Weka Namba ya Simu ya Malipo (M-Pesa, Tigo, Airtel, Halo):
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="07xxxxxxxx au 06xxxxxxxx"
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Ujumbe wa siri (STK Push) utatokea moja kwa moja kwenye simu yako kuingiza PIN.
                </p>
              </div>

              {payStatusText && (
                <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{payStatusText}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalGame(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Ghairi
                </button>

                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isPaying || !payPhone}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  <span>{isPaying ? 'Inatuma...' : 'Tuma Malipo'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}