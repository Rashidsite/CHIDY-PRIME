'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

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

      const { data, error } = await supabase
        .from('user_purchases')
        .select('*')
        .or(`customer_phone.eq.${clean255},customer_phone.eq.${local0},phone_number.eq.${clean255},phone_number.eq.${local0}`)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.warn('[useProductAccess] Query warning:', error.message);
        return;
      }

      const map = new Map<string, UnlockedPurchase>();
      const now = new Date().getTime();

      (data || []).forEach((row: any) => {
        const prodId = row.product_id || row.game_id;
        if (!prodId) return;

        let isExpired = false;
        if (row.access_expires_at) {
          const expTime = new Date(row.access_expires_at).getTime();
          if (!isNaN(expTime) && expTime < now) {
            isExpired = true;
          }
        }

        const purchaseItem: UnlockedPurchase = {
          id: row.id,
          productId: String(prodId),
          productTitle: row.product_title || 'Premium Game',
          customerPhone: row.customer_phone || row.phone_number || clean255,
          orderRef: row.order_reference || row.order_id,
          downloadLinks: Array.isArray(row.download_links) ? row.download_links : [],
          downloadToken: row.download_token,
          accessDuration: row.access_duration || 'Lifetime',
          accessExpiresAt: row.access_expires_at || null,
          status: isExpired ? 'expired' : (row.status === 'revoked' ? 'revoked' : 'active'),
          unlockedAt: row.unlocked_at || row.created_at,
        };

        map.set(String(prodId), purchaseItem);
      });

      setPurchases(map);
    } catch (err) {
      console.error('[useProductAccess] Failed to fetch purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [userPhone, supabase]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // REALTIME SUPABASE BROADCAST LISTENER
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
