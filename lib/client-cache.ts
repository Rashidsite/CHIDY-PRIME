/**
 * In-Memory & Storage-Persistent Stale-While-Revalidate (SWR) Client Cache
 * Eliminates 500ms-2s database fetch latency on tab switches by serving cached data in 0ms
 * while silently background-updating without flickering or resetting state.
 */

export interface CachedStorefrontData {
  games?: any[];
  slides?: any[];
  categories?: any[];
  bgSettings?: any;
  trendingConfig?: any;
  slideshowInterval?: number;
  slideshowEnabled?: boolean;
  timestamp?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

const SF_CACHE_KEY = 'cpcg_cached_storefront_v2';
const EXPLORE_CACHE_KEY = 'cpcg_cached_explore_v2';

function safeStorageGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    const str = JSON.stringify(data);
    sessionStorage.setItem(key, str);
    localStorage.setItem(key, str);
  } catch (e) {
    console.warn('safeStorageSet notice:', e);
  }
}

export function getCachedStorefrontData(): CachedStorefrontData | null {
  const mem = memoryCache.get(SF_CACHE_KEY);
  if (mem?.data && Array.isArray(mem.data.games) && mem.data.games.length > 0) {
    return mem.data;
  }
  const saved = safeStorageGet<CachedStorefrontData>(SF_CACHE_KEY);
  if (saved && Array.isArray(saved.games) && saved.games.length > 0) {
    memoryCache.set(SF_CACHE_KEY, { data: saved, timestamp: saved.timestamp || Date.now() });
    return saved;
  }
  return null;
}

export function setCachedStorefrontData(data: Partial<CachedStorefrontData>) {
  const existing = getCachedStorefrontData() || {};
  const merged: CachedStorefrontData = {
    ...existing,
    ...data,
    timestamp: Date.now(),
  };
  memoryCache.set(SF_CACHE_KEY, { data: merged, timestamp: merged.timestamp || Date.now() });
  safeStorageSet(SF_CACHE_KEY, merged);
}

export function hasCachedStorefrontGames(): boolean {
  const cached = getCachedStorefrontData();
  return Boolean(cached && cached.games && cached.games.length > 0);
}

export function getCachedExploreGames(): any[] | null {
  const mem = memoryCache.get(EXPLORE_CACHE_KEY);
  if (mem?.data && Array.isArray(mem.data) && mem.data.length > 0) {
    return mem.data;
  }
  const saved = safeStorageGet<any[]>(EXPLORE_CACHE_KEY);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    memoryCache.set(EXPLORE_CACHE_KEY, { data: saved, timestamp: Date.now() });
    return saved;
  }
  return null;
}

export function setCachedExploreGames(games: any[]) {
  if (!Array.isArray(games)) return;
  memoryCache.set(EXPLORE_CACHE_KEY, { data: games, timestamp: Date.now() });
  safeStorageSet(EXPLORE_CACHE_KEY, games);
}

export function updateCachedGame(updatedGame: any) {
  if (!updatedGame?.id) return;

  // 1. Update storefront cache
  const sf = getCachedStorefrontData();
  if (sf && Array.isArray(sf.games)) {
    const exists = sf.games.some((g: any) => g.id === updatedGame.id);
    const newGames = exists
      ? sf.games.map((g: any) => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g))
      : [updatedGame, ...sf.games];
    setCachedStorefrontData({ games: newGames });
  }

  // 2. Update explore cache
  const exp = getCachedExploreGames();
  if (exp && Array.isArray(exp)) {
    const isFeed = updatedGame.is_new_feed !== false;
    let newExp = exp;
    if (isFeed) {
      const exists = exp.some((g: any) => g.id === updatedGame.id);
      newExp = exists
        ? exp.map((g: any) => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g))
        : [updatedGame, ...exp];
    } else {
      newExp = exp.filter((g: any) => g.id !== updatedGame.id);
    }
    setCachedExploreGames(newExp);
  }
}

export function removeCachedGame(gameId: string) {
  if (!gameId) return;
  const sf = getCachedStorefrontData();
  if (sf && Array.isArray(sf.games)) {
    setCachedStorefrontData({ games: sf.games.filter((g: any) => g.id !== gameId) });
  }
  const exp = getCachedExploreGames();
  if (exp && Array.isArray(exp)) {
    setCachedExploreGames(exp.filter((g: any) => g.id !== gameId));
  }
}

export async function fetchWithClientCache<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60000 // 1 minute default TTL
): Promise<T> {
  const cached = memoryCache.get(key);
  const now = Date.now();

  // If cache exists and is fresh, return immediately
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  // If cache exists but is stale, return stale data immediately & update in background
  if (cached) {
    fetcher()
      .then((fresh) => {
        memoryCache.set(key, { data: fresh, timestamp: Date.now() });
      })
      .catch((err) => console.warn('Background cache revalidation failed for:', key, err));
    return cached.data;
  }

  // No cache present: fetch directly and store
  const fresh = await fetcher();
  memoryCache.set(key, { data: fresh, timestamp: Date.now() });
  return fresh;
}

export function invalidateClientCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((k) => {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  });
}
