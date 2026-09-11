'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PopupConfig {
  enabled: boolean;
  title: string;
  message: string;
  btn_text: string;
  btn_link: string;
  icon: string;
  badge?: string;
  delay_seconds: number;
}

export default function GameToastPopup() {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    if (typeof window !== 'undefined' && sessionStorage.getItem('game_toast_dismissed') === '1') {
      return;
    }

    let timer: NodeJS.Timeout;

    async function fetchPopup() {
      try {
        const res = await fetch('/api/popup', { cache: 'no-cache' });
        const data = await res.json();
        if (data.success && data.config && data.config.enabled) {
          setConfig(data.config);
          const delay = Math.max(0, (parseInt(data.config.delay_seconds, 10) || 3) * 1000);
          timer = setTimeout(() => {
            setVisible(true);
          }, delay);
        }
      } catch (err) {
        // Silently ignore
      }
    }

    fetchPopup();

    // Subscribe to realtime updates
    const supabase = createClient();
    const channel = supabase
      .channel('game-popup-realtime')
      .on('broadcast', { event: 'GAME_POPUP_UPDATED' }, (payload: any) => {
        if (payload && payload.payload) {
          const newConfig = payload.payload;
          if (newConfig.enabled) {
            setConfig(newConfig);
            setVisible(true);
            setClosing(false);
          } else {
            setVisible(false);
          }
        }
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 350);

    try {
      sessionStorage.setItem('game_toast_dismissed', '1');
    } catch (_) {}
  };

  if (!visible || !config || !config.enabled) {
    return null;
  }

  const isImg =
    config.icon.startsWith('http://') ||
    config.icon.startsWith('https://') ||
    config.icon.startsWith('/');

  return (
    <>
      <style jsx global>{`
        @keyframes gameToastSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes gameToastSlideDown {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
        }
        .animate-toast-enter {
          animation: gameToastSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-exit {
          animation: gameToastSlideDown 0.32s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }
      `}</style>

      <div
        role="alert"
        aria-live="polite"
        style={{
          background: 'linear-gradient(145deg, #131520, #0a0b10)',
          border: '1px solid #00f2ff',
          boxShadow: '0 8px 30px rgba(0, 242, 255, 0.35), 0 0 12px rgba(0, 242, 255, 0.2)',
        }}
        className={`fixed z-[999999] p-3 sm:p-3.5 rounded-2xl text-white font-sans transition-all
          bottom-20 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:w-[320px] max-w-[calc(100vw-24px)]
          ${closing ? 'animate-toast-exit' : 'animate-toast-enter'}
        `}
      >
        {/* Close button (X) */}
        <button
          onClick={handleClose}
          aria-label="Funga tangazo"
          className="absolute top-1.5 right-2 sm:top-2 sm:right-2.5 text-slate-400 hover:text-[#ff10f0] transition-colors p-1 text-lg leading-none cursor-pointer flex items-center justify-center rounded-full"
          title="Funga"
        >
          &times;
        </button>

        <div className="flex items-center gap-3">
          {/* Icon Box */}
          <div
            style={{
              background: 'rgba(0, 242, 255, 0.1)',
              border: '1px solid rgba(0, 242, 255, 0.25)',
            }}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl select-none"
          >
            {isImg ? (
              <img
                src={config.icon}
                alt="Icon"
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <span>{config.icon || '🎮'}</span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-xs font-black text-[#00f2ff] uppercase tracking-wider truncate">
                {config.title || 'TANGAZO LA GAME'}
              </h4>
              {config.badge && (
                <span
                  style={{
                    background: 'rgba(0, 242, 255, 0.15)',
                    color: '#00f2ff',
                    border: '1px solid rgba(0, 242, 255, 0.4)',
                  }}
                  className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full shrink-0"
                >
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
                boxShadow: '0 0 14px rgba(255, 16, 240, 0.5)',
              }}
              className="inline-block text-[11px] font-black uppercase text-white px-3.5 py-1 rounded-md hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              {config.btn_text || 'FUNGUA HAPA'}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
