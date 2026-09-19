'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateDurationExpiry } from '@/lib/access-duration';

export interface UnlockedPurchase {
  id?: string;
  productId: string;
  productTitle: string;
  customerPhone: string;
  orderRef?: string;
  downloadLinks?: Array<{ title?: string; url?: string; type?: string }>;
  downloadToken?: string;
  accessDuration?: string;
  accessExpiresAt?: string | null;
  status: 'active' | 'expired' | 'revoked';
  unlockedAt: string;
}

export interface UseProductAccessOptions {
  phone?: string | null;
  onUnlocked?: (purchase: UnlockedPurchase) => void;
}

// ── Universal Phone Normalizer (Standard Tanzanian 255XXXXXXXXX format) ─────
function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '255' + digits.substring(1);
  if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length === 9) return '255' + digits;
  if (digits.startsWith('255') && digits.length === 12) return digits;
  if (digits.startsWith('0')) return '255' + digits.substring(1);
  return digits;
}

// ── Persistent Local Access Cache (survives page navigation instantly) ───────
const LOCAL_CACHE_KEY = 'cpcg_access_cache_v2';

interface AccessCacheEntry {
  productId: string;
  productTitle: string;
  accessDuration: string;
  accessExpiresAt: string | null;
  unlockedAt: string;
  orderRef?: string;
}

function readLocalCache(): Record<string, AccessCacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const cache: Record<string, AccessCacheEntry> = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
    
    // Merge from cpcg_unlocked_durations
    const durStr = localStorage.getItem('cpcg_unlocked_durations');
    if (durStr) {
      try {
        const durations = JSON.parse(durStr);
        Object.entries(durations).forEach(([pId, d]: [string, any]) => {
          if (!cache[pId]) {
            cache[pId] = {
              productId: pId,
              productTitle: d.title || 'Unlocked Game',
              accessDuration: d.duration || 'Lifetime',
              accessExpiresAt: d.expiresAt || null,
              unlockedAt: d.unlockedAt || new Date().toISOString(),
              orderRef: d.orderRef,
            };
          }
        });
      } catch {}
    }

    return cache;
  } catch { return {}; }
}

function saveCacheEntry(entry: AccessCacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    const cache = readLocalCache();
    cache[entry.productId] = entry;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function isCacheEntryActive(entry: AccessCacheEntry): boolean {
  if (!entry.accessExpiresAt) return true;
  return new Date(entry.accessExpiresAt).getTime() > Date.now();
}

export function useProductAccess({ phone, onUnlocked }: UseProductAccessOptions = {}) {
  const [purchases, setPurchases] = useState<Map<string, UnlockedPurchase>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [userPhone, setUserPhone] = useState<string>('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let resolved = phone ? normalizePhone(phone) : '';
    if (!resolved && typeof window !== 'undefined') {
      const stored = localStorage.getItem('cpcg_user_phone') || localStorage.getItem('cpcg_registered') || localStorage.getItem('chidyprime_user_phone');
      if (stored) {
        try {
          if (stored.startsWith('{')) {
            const parsed = JSON.parse(stored);
            resolved = normalizePhone(parsed.phone || parsed.phoneNumber || '');
          } else {
            resolved = normalizePhone(stored);
          }
        } catch {
          resolved = normalizePhone(stored);
        }
      }
    }
    setUserPhone(resolved);
  }, [phone]);

  // ── Bootstrap from localStorage cache immediately (no loading flash on navigation) ──
  useEffect(() => {
    const cache = readLocalCache();
    const entries = Object.values(cache).filter(isCacheEntryActive);
    if (entries.length === 0) return;
    setPurchases((prev) => {
      const next = new Map(prev);
      entries.forEach((entry) => {
        if (!next.has(entry.productId)) {
          next.set(entry.productId, {
            productId: entry.productId,
            productTitle: entry.productTitle,
            customerPhone: userPhone,
            orderRef: entry.orderRef,
            downloadLinks: [],
            accessDuration: entry.accessDuration,
            accessExpiresAt: entry.accessExpiresAt,
            status: 'active',
            unlockedAt: entry.unlockedAt,
          });
        }
      });
      return next;
    });
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPhone]);

  const fetchPurchases = useCallback(async () => {
    if (!userPhone) {
      setPurchases(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const clean255 = normalizePhone(userPhone);
      const local0 = clean255.startsWith('255') ? '0' + clean255.slice(3) : clean255;
      const now = new Date().getTime();
      const map = new Map<string, UnlockedPurchase>();

      const phoneCore = clean255.length >= 9 ? clean255.slice(-9) : clean255;

      // ── PRIMARY: Query payment_orders (main payment table used by server.js / checkout) ──
      const { data: poData } = await supabase
        .from('payment_orders')
        .select('id, post_id, phone_number, status, promo_used, created_at, visitor_id')
        .or(`phone_number.eq.${clean255},phone_number.eq.${local0},phone_number.ilike.%${phoneCore}%`)
        .in('status', ['approved', 'completed', 'paid'])
        .order('created_at', { ascending: false });

      // ── Get expiry info from user_access (written by handleSuccessfulPayment in server.js) ──
      let userAccessMap: Record<string, string | null> = {};
      if (poData && poData.length > 0) {
        const visitorIds = [...new Set((poData as any[]).map((o: any) => o.visitor_id).filter(Boolean))];
        if (visitorIds.length > 0) {
          const { data: accessData } = await supabase
            .from('user_access')
            .select('post_id, expires_at')
            .in('visitor_id', visitorIds);
          (accessData || []).forEach((a: any) => {
            if (a.post_id) userAccessMap[String(a.post_id)] = a.expires_at || null;
          });
        }

        // ── Fetch post titles for payment_orders (batch) ──
        const postIds = [...new Set((poData as any[]).map((o: any) => o.post_id).filter(Boolean))];
        let postsMap: Record<string, any> = {};
        if (postIds.length > 0) {
          const { data: postsData } = await supabase
            .from('posts')
            .select('id, title, access_duration, license_duration, duration_days')
            .in('id', postIds);
          (postsData || []).forEach((p: any) => { postsMap[String(p.id)] = p; });
        }

        (poData as any[]).forEach((row: any) => {
          const prodId = row.post_id;
          if (!prodId) return;

          const post = postsMap[String(prodId)] || {};
          let dur =
            post.access_duration ||
            post.license_duration ||
            post.plan_duration;
          if (!dur && post.duration_days !== undefined && post.duration_days !== null) {
            if (post.duration_days === 2) dur = '2 Hours';
            else if (post.duration_days === 1 || post.duration_days === 24) dur = '24 Hours';
            else if (post.duration_days === 7) dur = '7 Days';
            else if (post.duration_days === 30) dur = '30 Days';
            else if (post.duration_days === 0) dur = 'Lifetime';
            else dur = `${post.duration_days} Days`;
          }
          const rawDuration = dur || 'Lifetime';

          // Prefer user_access expires_at, fallback to duration-based computation
          const userExp = userAccessMap[String(prodId)];
          let accessExpiresAt: string | null = null;
          if (userExp) {
            accessExpiresAt = userExp;
          } else {
            accessExpiresAt = calculateDurationExpiry(rawDuration, new Date(row.created_at));
          }

          if (accessExpiresAt && new Date(accessExpiresAt).getTime() < now) return; // expired

          const item: UnlockedPurchase = {
            id: row.id,
            productId: String(prodId),
            productTitle: post.title || 'Premium Game',
            customerPhone: row.phone_number || clean255,
            orderRef: row.promo_used,
            downloadLinks: [],
            accessDuration: rawDuration,
            accessExpiresAt,
            status: 'active',
            unlockedAt: row.created_at,
          };

          map.set(String(prodId), item);

          // Persist to local cache
          saveCacheEntry({
            productId: String(prodId),
            productTitle: item.productTitle,
            accessDuration: rawDuration,
            accessExpiresAt,
            unlockedAt: row.created_at,
            orderRef: row.promo_used,
          });
        });
      }

      // ── FALLBACK: Query orders table (legacy / webhook-written) ──────────
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, game_id, product_id, visitor_phone, phone_number, status, access_duration, access_expires_at, order_number, created_at, game_title')
        .or(`visitor_phone.eq.${clean255},visitor_phone.eq.${local0},phone_number.eq.${clean255},phone_number.eq.${local0}`)
        .in('status', ['approved', 'completed', 'paid'])
        .order('created_at', { ascending: false });

      (ordersData || []).forEach((row: any) => {
        const prodId = row.game_id || row.product_id;
        if (!prodId || map.has(String(prodId))) return; // skip if already found

        if (row.access_expires_at) {
          const expTime = new Date(row.access_expires_at).getTime();
          if (!isNaN(expTime) && expTime < now) return; // expired
        }

        const item: UnlockedPurchase = {
          id: row.id,
          productId: String(prodId),
          productTitle: row.game_title || 'Premium Game',
          customerPhone: row.visitor_phone || row.phone_number || clean255,
          orderRef: row.order_number,
          downloadLinks: [],
          accessDuration: row.access_duration || 'Lifetime',
          accessExpiresAt: row.access_expires_at || null,
          status: 'active',
          unlockedAt: row.created_at,
        };

        map.set(String(prodId), item);

        saveCacheEntry({
          productId: String(prodId),
          productTitle: item.productTitle,
          accessDuration: item.accessDuration || 'Lifetime',
          accessExpiresAt: item.accessExpiresAt || null,
          unlockedAt: row.created_at,
          orderRef: row.order_number,
        });
      });

      setPurchases(map);
    } catch (err) {
      console.error('[useProductAccess] Failed to fetch purchases:', err);
      // On error, ensure local cache is still used
      const cache = readLocalCache();
      const entries = Object.values(cache).filter(isCacheEntryActive);
      if (entries.length > 0) {
        const map = new Map<string, UnlockedPurchase>();
        entries.forEach((entry) => {
          map.set(entry.productId, {
            productId: entry.productId,
            productTitle: entry.productTitle,
            customerPhone: userPhone,
            orderRef: entry.orderRef,
            downloadLinks: [],
            accessDuration: entry.accessDuration,
            accessExpiresAt: entry.accessExpiresAt,
            status: 'active',
            unlockedAt: entry.unlockedAt,
          });
        });
        setPurchases(map);
      }
    } finally {
      setLoading(false);
    }
  }, [userPhone, supabase]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // ── REALTIME SUPABASE BROADCAST LISTENER ────────────────────────────────
  useEffect(() => {
    if (!userPhone) return;
    const cleanUserPhone = normalizePhone(userPhone);

    const channel = supabase
      .channel('storefront-sync')
      .on('broadcast', { event: 'PRODUCT_UNLOCKED' }, (eventPayload: any) => {
        const payload = eventPayload?.payload;
        if (!payload) return;

        const eventPhone = normalizePhone(payload.phone || payload.customerPhone);
        if (eventPhone === cleanUserPhone && payload.productId) {
          const newPurchase: UnlockedPurchase = {
            productId: String(payload.productId),
            productTitle: payload.productTitle || 'Premium Game',
            customerPhone: cleanUserPhone,
            orderRef: payload.orderRef,
            downloadLinks: payload.downloadLinks || [],
            downloadToken: payload.downloadToken,
            accessDuration: payload.accessDuration || 'Lifetime',
            accessExpiresAt: payload.accessExpiresAt || null,
            status: 'active',
            unlockedAt: payload.unlockedAt || new Date().toISOString(),
          };

          setPurchases((prev) => {
            const next = new Map(prev);
            next.set(String(payload.productId), newPurchase);
            return next;
          });

          if (onUnlocked) {
            onUnlocked(newPurchase);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userPhone, supabase, onUnlocked]);

  const isUnlocked = useCallback(
    (productId: string): boolean => {
      const p = purchases.get(String(productId));
      if (!p || p.status !== 'active') return false;
      if (p.accessExpiresAt) {
        return new Date(p.accessExpiresAt).getTime() > Date.now();
      }
      return true;
    },
    [purchases]
  );

  const getRemainingTimeBadge = useCallback(
    (productId: string): { label: string; isExpired: boolean; isLifetime: boolean; color: string } => {
      const p = purchases.get(String(productId));
      if (!p) {
        return { label: 'Bado Hajanunua', isExpired: true, isLifetime: false, color: 'text-slate-400' };
      }

      if (!p.accessExpiresAt || p.accessDuration?.toLowerCase().includes('lifetime') || p.accessDuration?.toLowerCase().includes('maisha')) {
        return {
          label: '♾️ Ufikiaji wa Maisha (Lifetime)',
          isExpired: false,
          isLifetime: true,
          color: 'text-emerald-400',
        };
      }

      const diffMs = new Date(p.accessExpiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        return {
          label: '⚠️ Muda wa Ufikiaji Umekwisha (Expired)',
          isExpired: true,
          isLifetime: false,
          color: 'text-rose-400',
        };
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days >= 1) {
        const remHours = hours % 24;
        return {
          label: `⏳ Muda wa Ufikiaji: Siku ${days} ${remHours > 0 ? `na masaa ${remHours}` : ''} zimebaki`,
          isExpired: false,
          isLifetime: false,
          color: days <= 2 ? 'text-amber-400' : 'text-cyan-400',
        };
      }

      const minutes = Math.floor(diffMs / (1000 * 60));
      if (hours >= 1) {
        const remMins = minutes % 60;
        return {
          label: `⏳ Muda wa Ufikiaji: Masaa ${hours} na dakika ${remMins} yamebaki`,
          isExpired: false,
          isLifetime: false,
          color: 'text-amber-400',
        };
      }

      return {
        label: `⏳ Muda wa Ufikiaji: Dakika ${Math.max(1, minutes)} zimebaki`,
        isExpired: false,
        isLifetime: false,
        color: 'text-rose-400 animate-pulse',
      };
    },
    [purchases]
  );

  const getPurchaseDetails = useCallback(
    (productId: string): UnlockedPurchase | null => {
      return purchases.get(String(productId)) || null;
    },
    [purchases]
  );

  const unlockedProductIds = useMemo(() => {
    const list: string[] = [];
    purchases.forEach((p, id) => {
      if (p.status === 'active') {
        if (!p.accessExpiresAt || new Date(p.accessExpiresAt).getTime() > Date.now()) {
          list.push(id);
        }
      }
    });
    return list;
  }, [purchases]);

  return {
    isUnlocked,
    getRemainingTimeBadge,
    getPurchaseDetails,
    unlockedProductIds,
    purchases,
    loading,
    refresh: fetchPurchases,
    customerPhone: userPhone,
  };
}
