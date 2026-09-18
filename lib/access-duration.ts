/**
 * Access Duration and Expiry Utility
 * Manages post purchase durations (2 Hours, 24 Hours, 7 Days, 30 Days, Lifetime)
 * Ensures purchases stay unlocked within their duration window even after closing modal/refreshing
 */

export function calculateDurationExpiry(
  durationRaw?: string | number | null,
  baseDate = new Date()
): string | null {
  if (durationRaw === undefined || durationRaw === null) return null;
  const s = String(durationRaw).toLowerCase().trim();
  if (
    !s ||
    s === '0' ||
    s === 'infinity' ||
    s.includes('lifetime') ||
    s.includes('maisha')
  ) {
    return null; // Lifetime: never expires
  }

  const baseMs = baseDate.getTime();
  let addedMs = 0;

  // 1. Check hours
  const hoursMatch = s.match(/(\d+)\s*(?:hour|hr|h|saa|masaa)/i);
  if (hoursMatch) {
    const hrs = parseInt(hoursMatch[1], 10);
    if (!isNaN(hrs) && hrs > 0) {
      addedMs = hrs * 3600 * 1000;
    }
  }

  // 2. Check days
  if (!addedMs) {
    const daysMatch = s.match(/(\d+)\s*(?:day|d|siku)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      if (!isNaN(days) && days > 0) {
        addedMs = days * 24 * 3600 * 1000;
      }
    }
  }

  // 3. Fallbacks for standard values
  if (!addedMs) {
    if (s.includes('2 hour') || s === '2') addedMs = 2 * 3600 * 1000;
    else if (s.includes('24 hour') || s === '24' || s === '1') addedMs = 24 * 3600 * 1000;
    else if (s.includes('7 day') || s === '7') addedMs = 7 * 24 * 3600 * 1000;
    else if (s.includes('30 day') || s === '30') addedMs = 30 * 24 * 3600 * 1000;
  }

  if (addedMs > 0) {
    return new Date(baseMs + addedMs).toISOString();
  }

  return null;
}

export function isGameAccessActive(
  gameId: string,
  durationRaw?: string | number | null
): boolean {
  if (typeof window === 'undefined' || !gameId) return false;
  try {
    const now = Date.now();

    // 1. Check cpcg_access_cache_v2
    const cacheStr = localStorage.getItem('cpcg_access_cache_v2');
    if (cacheStr) {
      const cache = JSON.parse(cacheStr);
      const entry = cache[gameId];
      if (entry) {
        if (!entry.accessExpiresAt) return true; // Lifetime
        const exp = new Date(entry.accessExpiresAt).getTime();
        if (!isNaN(exp) && exp > now) return true;
        if (!isNaN(exp) && exp <= now) return false; // Explicitly expired
      }
    }

    // 2. Check cpcg_unlocked_durations
    const durStr = localStorage.getItem('cpcg_unlocked_durations');
    if (durStr) {
      const durations = JSON.parse(durStr);
      const entry = durations[gameId];
      if (entry) {
        if (!entry.expiresAt) return true; // Lifetime
        const exp = new Date(entry.expiresAt).getTime();
        if (!isNaN(exp) && exp > now) return true;
        if (!isNaN(exp) && exp <= now) return false; // Explicitly expired
      }
    }

    // 3. Check user phone-specific unlocked key
    const userPhone = localStorage.getItem('cpcg_user_phone') || '';
    if (userPhone) {
      const clean = userPhone.replace(/\D/g, '');
      const phoneItem = localStorage.getItem(`cpcg_unlocked_${clean}_${gameId}`);
      if (phoneItem) {
        const parsed = JSON.parse(phoneItem);
        if (parsed?.expiresAt) {
          const exp = new Date(parsed.expiresAt).getTime();
          if (!isNaN(exp) && exp > now) return true;
          if (!isNaN(exp) && exp <= now) return false;
        } else if (parsed?.unlockedAt) {
          const expiresAt = calculateDurationExpiry(parsed.duration || durationRaw, new Date(parsed.unlockedAt));
          if (!expiresAt) return true;
          if (new Date(expiresAt).getTime() > now) return true;
          return false;
        }
      }
    }

    // 4. Check cpcg_unlocked_games array
    const unlockedList = localStorage.getItem('cpcg_unlocked_games');
    if (unlockedList) {
      const ids: string[] = JSON.parse(unlockedList);
      if (Array.isArray(ids) && ids.includes(gameId)) {
        return true;
      }
    }
  } catch (e) {
    console.error('isGameAccessActive check error:', e);
  }
  return false;
}

export function saveUnlockedAccess(
  gameId: string,
  gameTitle: string,
  durationRaw?: string | number | null,
  phone?: string | null,
  orderRef?: string | null
) {
  if (typeof window === 'undefined' || !gameId) return;
  try {
    const expiresAt = calculateDurationExpiry(durationRaw, new Date());
    const unlockedAt = new Date().toISOString();
    const durationStr = durationRaw ? String(durationRaw) : 'Lifetime';

    // 1. Update cpcg_unlocked_durations
    let durations: Record<string, any> = {};
    try {
      durations = JSON.parse(localStorage.getItem('cpcg_unlocked_durations') || '{}');
    } catch {}
    durations[gameId] = {
      unlockedAt,
      expiresAt,
      duration: durationStr,
    };
    localStorage.setItem('cpcg_unlocked_durations', JSON.stringify(durations));

    // 2. Update cpcg_access_cache_v2
    let accessCache: Record<string, any> = {};
    try {
      accessCache = JSON.parse(localStorage.getItem('cpcg_access_cache_v2') || '{}');
    } catch {}
    accessCache[gameId] = {
      productId: gameId,
      productTitle: gameTitle,
      accessDuration: durationStr,
      accessExpiresAt: expiresAt,
      unlockedAt,
      orderRef: orderRef || undefined,
    };
    localStorage.setItem('cpcg_access_cache_v2', JSON.stringify(accessCache));

    // 3. Update cpcg_unlocked_games
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem('cpcg_unlocked_games') || '[]');
    } catch {}
    if (!Array.isArray(list)) list = [];
    if (!list.includes(gameId)) {
      list.push(gameId);
      localStorage.setItem('cpcg_unlocked_games', JSON.stringify(list));
    }

    // 4. Update phone-specific key if phone provided
    if (phone) {
      const clean = phone.replace(/\D/g, '');
      if (clean) {
        localStorage.setItem(
          `cpcg_unlocked_${clean}_${gameId}`,
          JSON.stringify({
            gameId,
            orderId: orderRef,
            orderNumber: orderRef,
            unlockedAt,
            expiresAt,
            status: 'completed',
            duration: durationStr,
          })
        );
      }
    }
  } catch (e) {
    console.error('saveUnlockedAccess error:', e);
  }
}
