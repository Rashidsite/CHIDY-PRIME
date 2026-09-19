/**
 * Access Duration and Expiry Utility
 * Manages post purchase durations (2 Hours, 24 Hours, 7 Days, 30 Days, Lifetime)
 * Ensures purchases stay unlocked within their duration window and lock strictly when expired.
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

  // 1. Direct number mappings (e.g. from duration_days column: 2 = 2 Hours, 1 or 24 = 24 Hours)
  if (typeof durationRaw === 'number') {
    if (durationRaw === 2) addedMs = 2 * 3600 * 1000; // 2 Hours
    else if (durationRaw === 1 || durationRaw === 24) addedMs = 24 * 3600 * 1000; // 24 Hours
    else if (durationRaw === 7) addedMs = 7 * 24 * 3600 * 1000; // 7 Days
    else if (durationRaw === 30) addedMs = 30 * 24 * 3600 * 1000; // 30 Days
    else if (durationRaw > 0) addedMs = durationRaw * 24 * 3600 * 1000;
  }

  // 2. Check explicit hours string (e.g. "2 Hours", "2 hrs", "masaa 2")
  if (!addedMs) {
    const hoursMatch = s.match(/(\d+)\s*(?:hour|hr|h|saa|masaa)/i);
    if (hoursMatch) {
      const hrs = parseInt(hoursMatch[1], 10);
      if (!isNaN(hrs) && hrs > 0) {
        addedMs = hrs * 3600 * 1000;
      }
    }
  }

  // 3. Check days string (e.g. "7 Days", "siku 7")
  if (!addedMs) {
    const daysMatch = s.match(/(\d+)\s*(?:day|d|siku)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      if (!isNaN(days) && days > 0) {
        addedMs = days * 24 * 3600 * 1000;
      }
    }
  }

  // 4. Fallbacks for standard values
  if (!addedMs) {
    if (s.includes('2 hour') || s.includes('masaa 2') || s === '2') addedMs = 2 * 3600 * 1000;
    else if (s.includes('24 hour') || s.includes('masaa 24') || s === '24' || s === '1') addedMs = 24 * 3600 * 1000;
    else if (s.includes('7 day') || s.includes('siku 7') || s === '7') addedMs = 7 * 24 * 3600 * 1000;
    else if (s.includes('30 day') || s.includes('siku 30') || s === '30') addedMs = 30 * 24 * 3600 * 1000;
  }

  if (addedMs > 0) {
    return new Date(baseMs + addedMs).toISOString();
  }

  return null;
}

/**
 * Actively prunes an expired game from all local storage caches
 */
export function pruneExpiredAccess(gameId: string) {
  if (typeof window === 'undefined' || !gameId) return;
  try {
    // 1. Remove from cpcg_unlocked_durations
    const durStr = localStorage.getItem('cpcg_unlocked_durations');
    if (durStr) {
      const durations = JSON.parse(durStr);
      if (durations[gameId]) {
        delete durations[gameId];
        localStorage.setItem('cpcg_unlocked_durations', JSON.stringify(durations));
      }
    }

    // 2. Remove from cpcg_access_cache_v2
    const cacheStr = localStorage.getItem('cpcg_access_cache_v2');
    if (cacheStr) {
      const cache = JSON.parse(cacheStr);
      if (cache[gameId]) {
        delete cache[gameId];
        localStorage.setItem('cpcg_access_cache_v2', JSON.stringify(cache));
      }
    }

    // 3. Remove from cpcg_unlocked_games list
    const unlStr = localStorage.getItem('cpcg_unlocked_games');
    if (unlStr) {
      const ids: string[] = JSON.parse(unlStr);
      if (Array.isArray(ids)) {
        const remaining = ids.filter((id) => String(id) !== String(gameId));
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(remaining));
      }
    }

    // 4. Remove phone-specific keys
    const userPhone = localStorage.getItem('cpcg_user_phone') || '';
    if (userPhone) {
      const clean = userPhone.replace(/\D/g, '');
      localStorage.removeItem(`cpcg_unlocked_${clean}_${gameId}`);
    }

    // Notify components that access state changed
    window.dispatchEvent(new CustomEvent('cpcg_access_expired', { detail: { gameId } }));
  } catch (e) {
    console.warn('pruneExpiredAccess notice:', e);
  }
}

/**
 * Scans all local storage entries and purges any that have expired
 */
export function cleanAllExpiredAccess(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const activeIds = new Set<string>();
  const now = Date.now();

  try {
    // Scan cpcg_unlocked_durations
    const durStr = localStorage.getItem('cpcg_unlocked_durations');
    let durationsChanged = false;
    let durations: Record<string, any> = {};
    if (durStr) {
      durations = JSON.parse(durStr);
      Object.entries(durations).forEach(([gId, entry]: [string, any]) => {
        if (entry?.expiresAt) {
          const expTime = new Date(entry.expiresAt).getTime();
          if (!isNaN(expTime) && expTime <= now) {
            delete durations[gId];
            durationsChanged = true;
          } else if (!isNaN(expTime) && expTime > now) {
            activeIds.add(String(gId));
          }
        } else {
          activeIds.add(String(gId)); // Lifetime
        }
      });
      if (durationsChanged) {
        localStorage.setItem('cpcg_unlocked_durations', JSON.stringify(durations));
      }
    }

    // Scan cpcg_access_cache_v2
    const cacheStr = localStorage.getItem('cpcg_access_cache_v2');
    let cacheChanged = false;
    let cache: Record<string, any> = {};
    if (cacheStr) {
      cache = JSON.parse(cacheStr);
      Object.entries(cache).forEach(([gId, entry]: [string, any]) => {
        if (entry?.accessExpiresAt) {
          const expTime = new Date(entry.accessExpiresAt).getTime();
          if (!isNaN(expTime) && expTime <= now) {
            delete cache[gId];
            cacheChanged = true;
          } else if (!isNaN(expTime) && expTime > now) {
            activeIds.add(String(gId));
          }
        } else {
          activeIds.add(String(gId)); // Lifetime
        }
      });
      if (cacheChanged) {
        localStorage.setItem('cpcg_access_cache_v2', JSON.stringify(cache));
      }
    }

    // Keep cpcg_unlocked_games strictly in sync with actively valid IDs
    const unlStr = localStorage.getItem('cpcg_unlocked_games');
    if (unlStr) {
      const ids: string[] = JSON.parse(unlStr);
      if (Array.isArray(ids)) {
        const filtered = ids.filter((id) => activeIds.has(String(id)));
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.warn('cleanAllExpiredAccess notice:', e);
  }

  return activeIds;
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
        if (entry.accessExpiresAt) {
          const exp = new Date(entry.accessExpiresAt).getTime();
          if (!isNaN(exp) && exp <= now) {
            pruneExpiredAccess(gameId);
            return false; // Explicitly expired
          }
          if (!isNaN(exp) && exp > now) return true;
        } else if (entry.unlockedAt && entry.accessDuration) {
          const computed = calculateDurationExpiry(entry.accessDuration, new Date(entry.unlockedAt));
          if (computed && new Date(computed).getTime() <= now) {
            pruneExpiredAccess(gameId);
            return false;
          }
          if (computed && new Date(computed).getTime() > now) return true;
          if (!computed) return true; // Truly lifetime
        } else {
          return true; // Lifetime
        }
      }
    }

    // 2. Check cpcg_unlocked_durations
    const durStr = localStorage.getItem('cpcg_unlocked_durations');
    if (durStr) {
      const durations = JSON.parse(durStr);
      const entry = durations[gameId];
      if (entry) {
        if (entry.expiresAt) {
          const exp = new Date(entry.expiresAt).getTime();
          if (!isNaN(exp) && exp <= now) {
            pruneExpiredAccess(gameId);
            return false; // Explicitly expired
          }
          if (!isNaN(exp) && exp > now) return true;
        } else if (entry.unlockedAt && entry.duration) {
          const computed = calculateDurationExpiry(entry.duration, new Date(entry.unlockedAt));
          if (computed && new Date(computed).getTime() <= now) {
            pruneExpiredAccess(gameId);
            return false;
          }
          if (computed && new Date(computed).getTime() > now) return true;
          if (!computed) return true; // Truly lifetime
        } else {
          return true; // Lifetime
        }
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
          if (!isNaN(exp) && exp <= now) {
            pruneExpiredAccess(gameId);
            return false;
          }
          if (!isNaN(exp) && exp > now) return true;
        } else if (parsed?.unlockedAt) {
          const expiresAt = calculateDurationExpiry(parsed.duration || durationRaw, new Date(parsed.unlockedAt));
          if (expiresAt && new Date(expiresAt).getTime() <= now) {
            pruneExpiredAccess(gameId);
            return false;
          }
          if (expiresAt && new Date(expiresAt).getTime() > now) return true;
          if (!expiresAt) return true;
        }
      }
    }

    // 4. Check cpcg_unlocked_games array ONLY for Lifetime products
    // If the game has a specified timed duration, it CANNOT be considered active without an unexpired record!
    const isTimedDuration = durationRaw !== undefined && durationRaw !== null && calculateDurationExpiry(durationRaw, new Date()) !== null;
    if (isTimedDuration) {
      return false; // No valid active unexpired session found for timed game
    }

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
