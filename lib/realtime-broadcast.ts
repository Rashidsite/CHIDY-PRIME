import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Broadcasts changes in real-time to all connected front-end storefront users
 * without requiring any manual browser refresh.
 */
export async function broadcastStorefrontChange(
  eventType: string,
  payload: Record<string, any> = {}
) {
  try {
    const supabase = createAdminClient();
    const syncPayload = {
      event: eventType,
      payload,
      timestamp: Date.now(),
    };

    // 1. Primary storefront sync channel
    try {
      const ch1 = supabase.channel('cross-domain-storefront-sync');
      await ch1.send({
        type: 'broadcast',
        event: 'STOREFRONT_DATA_CHANGED',
        payload: syncPayload,
      });
    } catch (e) {
      // Ignore
    }

    // 2. Secondary storefront-sync channel
    try {
      const ch2 = supabase.channel('storefront-sync');
      await ch2.send({
        type: 'broadcast',
        event: eventType,
        payload,
      });
    } catch (e) {
      // Ignore
    }

    // 3. Dedicated channel for popup ads
    if (eventType === 'GAME_POPUP_UPDATED') {
      try {
        const ch3 = supabase.channel('game-popup-realtime');
        await ch3.send({
          type: 'broadcast',
          event: 'GAME_POPUP_UPDATED',
          payload,
        });
      } catch (e) {
        // Ignore
      }
    }
  } catch (err: any) {
    console.warn('[RealtimeBroadcast] Warning:', err?.message);
  }
}
