/**
 * In-Memory Stale-While-Revalidate Client Cache for Fast Admin & Storefront Queries
 * Eliminates 500ms-2s database fetch latency on tab switches by serving cached data in 0ms
 * while silently background-updating.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

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
