'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * RealtimeStorefrontSync ensures that any addition, modification, or deletion
 * made in the admin panel instantly reflects on the storefront in real-time
 * without the user ever having to reload or refresh their browser.
 */
export default function RealtimeStorefrontSync() {
  const lastSyncTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let channel: any = null;

    const triggerClientSync = (origin: string, detail?: any) => {
      try {
        const now = Date.now();
        // Throttle rapid duplicate events within 500ms
        if (now - lastSyncTimeRef.current < 500) return;
        lastSyncTimeRef.current = now;

        // Dispatch custom DOM event for active storefront components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('cpcg_storefront_sync', {
              detail: { origin, data: detail, timestamp: now },
            })
          );
        }
      } catch (_) {}
    };

    try {
      const supabase = createClient();

      // ── 1. SUPABASE REALTIME WEBSOCKET LISTENER ──
      channel = supabase
        .channel('cross-domain-storefront-sync')
        .on('broadcast', { event: 'STOREFRONT_DATA_CHANGED' }, (payload: any) => {
          triggerClientSync('broadcast_data_changed', payload);
        })
        .on('broadcast', { event: 'STORE_SETTINGS_UPDATED' }, (payload: any) => {
          triggerClientSync('broadcast_settings', payload);
        })
        .on('broadcast', { event: 'GAME_POPUP_UPDATED' }, (payload: any) => {
          triggerClientSync('broadcast_popup', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload: any) => {
          triggerClientSync('postgres_posts', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload: any) => {
          triggerClientSync('postgres_products', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload: any) => {
          triggerClientSync('postgres_games', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
          triggerClientSync('postgres_site_settings', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slides' }, (payload: any) => {
          triggerClientSync('postgres_slides', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload: any) => {
          triggerClientSync('postgres_categories', payload);
        })
        .subscribe();
    } catch (err) {
      console.warn('[RealtimeStorefrontSync] Channel error suppressed:', err);
    }

    // ── 2. VISIBILITY RESUME & BACKGROUND SYNC (RESILIENT MOBILE NETWORK FALLBACK) ──
    const handleVisibilityChange = () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          triggerClientSync('tab_focus');
        }
      } catch (_) {}
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Gentle 20-second heartbeat poll to safeguard against network dropouts
    const interval = setInterval(() => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          triggerClientSync('heartbeat');
        }
      } catch (_) {}
    }, 20000);

    return () => {
      try {
        if (channel) {
          const supabase = createClient();
          supabase.removeChannel(channel);
        }
      } catch (_) {}
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      clearInterval(interval);
    };
  }, []);

  return null;
}
