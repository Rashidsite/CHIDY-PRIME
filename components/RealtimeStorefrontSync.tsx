'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * RealtimeStorefrontSync ensures that any addition, modification, or deletion
 * made in the admin panel instantly reflects on the storefront in real-time
 * without the user ever having to reload or refresh their browser.
 */
export default function RealtimeStorefrontSync() {
  const router = useRouter();
  const lastSyncTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = createClient();

    const triggerClientSync = (origin: string, detail?: any) => {
      const now = Date.now();
      // Throttle rapid duplicate events within 300ms
      if (now - lastSyncTimeRef.current < 300) return;
      lastSyncTimeRef.current = now;

      // 1. Dispatch custom DOM event for active components (e.g. FrontHubPage, GameToastPopup)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cpcg_storefront_sync', {
            detail: { origin, data: detail, timestamp: now },
          })
        );
      }

      // 2. Refresh Next.js server components cache smoothly in background
      try {
        router.refresh();
      } catch {}
    };

    // ── 1. SUPABASE REALTIME WEBSOCKET LISTENER ──
    const channel = supabase
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

    // ── 2. VISIBILITY RESUME & BACKGROUND SYNC (RESILIENT MOBILE NETWORK FALLBACK) ──
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Trigger a background re-sync when customer returns to tab
        triggerClientSync('tab_focus');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subtle 15-second heartbeat poll to safeguard against network dropouts
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerClientSync('heartbeat');
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
