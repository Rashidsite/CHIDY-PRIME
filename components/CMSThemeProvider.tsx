'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_CMS_CONFIG,
  CMSConfigData,
  CMSBottomNavConfig,
  CMSAnimationConfig,
  CMSThemePresetConfig,
  ButtonPreset,
  CornerRadius,
} from '@/lib/cmsDefaults';

interface CMSThemeContextType {
  bottomNav: CMSBottomNavConfig;
  animations: CMSAnimationConfig;
  themePresets: CMSThemePresetConfig;
  getButtonClass: (variant?: 'buy' | 'download' | 'action') => string;
  updateThemeLocally: (newConfig: Partial<CMSConfigData>) => void;
  refetchTheme: () => Promise<void>;
  isLoading: boolean;
}

const CMSThemeContext = createContext<CMSThemeContextType>({
  bottomNav: DEFAULT_CMS_CONFIG.bottom_nav,
  animations: DEFAULT_CMS_CONFIG.animations,
  themePresets: DEFAULT_CMS_CONFIG.theme_presets,
  getButtonClass: () => 'bg-blue-600 hover:bg-blue-500 text-white rounded-2xl',
  updateThemeLocally: () => {},
  refetchTheme: async () => {},
  isLoading: false,
});

export function CMSThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CMSConfigData>(DEFAULT_CMS_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchThemeConfig = async () => {
    try {
      const res = await fetch('/api/admin/cms/ui');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig((prev) => ({
          ...prev,
          bottom_nav: { ...DEFAULT_CMS_CONFIG.bottom_nav, ...data.config.bottom_nav },
          animations: { ...DEFAULT_CMS_CONFIG.animations, ...data.config.animations },
          theme_presets: { ...DEFAULT_CMS_CONFIG.theme_presets, ...data.config.theme_presets },
        }));
      }
    } catch (err) {
      console.warn('Failed to load initial CMS theme config, using defaults:', err);
    }
  };

  useEffect(() => {
    fetchThemeConfig();

    // Subscribe to Supabase Realtime channel for instant live updates
    const channel = supabase
      .channel('cms-theme-sync')
      .on('broadcast', { event: 'CMS_THEME_UPDATED' }, (payload) => {
        if (payload?.payload) {
          const { bottom_nav, animations, theme_presets } = payload.payload;
          setConfig((prev) => ({
            ...prev,
            bottom_nav: bottom_nav ? { ...prev.bottom_nav, ...bottom_nav } : prev.bottom_nav,
            animations: animations ? { ...prev.animations, ...animations } : prev.animations,
            theme_presets: theme_presets ? { ...prev.theme_presets, ...theme_presets } : prev.theme_presets,
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
        const key = (payload.new as any)?.key;
        const value = (payload.new as any)?.value;
        if (key && value) {
          if (key === 'cms_bottom_nav') setConfig((p) => ({ ...p, bottom_nav: value }));
          if (key === 'cms_animations') setConfig((p) => ({ ...p, animations: value }));
          if (key === 'cms_theme_presets') setConfig((p) => ({ ...p, theme_presets: value }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getButtonClass = (variant: 'buy' | 'download' | 'action' = 'action') => {
    const { button_preset, corner_radius } = config.theme_presets;

    let base = 'font-black uppercase tracking-wider transition-all duration-300 shadow-md ';

    // Corner Radius
    switch (corner_radius) {
      case 'rounded-xl':
        base += 'rounded-xl ';
        break;
      case 'rounded-full':
        base += 'rounded-full ';
        break;
      case 'rounded-none':
        base += 'rounded-none ';
        break;
      case 'rounded-2xl':
      default:
        base += 'rounded-2xl ';
        break;
    }

    // Color Preset
    if (variant === 'download') {
      return base + 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400';
    }

    switch (button_preset) {
      case 'solid_emerald':
        return base + 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400';
      case 'cyan_cyberpunk':
        return base + 'bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-cyan-500/40 border border-cyan-300';
      case 'minimalist_border':
        return base + 'bg-slate-900 hover:bg-blue-600 text-blue-400 hover:text-white border-2 border-blue-500/50 hover:border-blue-400 shadow-blue-500/20';
      case 'royal_blue':
      default:
        return base + 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 border border-blue-400';
    }
  };

  const updateThemeLocally = (newConfig: Partial<CMSConfigData>) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
  };

  return (
    <CMSThemeContext.Provider
      value={{
        bottomNav: config.bottom_nav,
        animations: config.animations,
        themePresets: config.theme_presets,
        getButtonClass,
        updateThemeLocally,
        refetchTheme: fetchThemeConfig,
        isLoading,
      }}
    >
      {children}
    </CMSThemeContext.Provider>
  );
}

export function useCMSTheme() {
  return useContext(CMSThemeContext);
}
