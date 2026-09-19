'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flame, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import HeroSlideshow, { Slide } from '@/components/HeroSlideshow';
import CategoryGrid, { CategoryItem } from '@/components/CategoryGrid';
import GameCatalog from '@/components/GameCatalog';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import RegisterModal from '@/components/RegisterModal';
import CelebrationPopup from '@/components/CelebrationPopup';
import GameCard, { GameProduct } from '@/components/GameCard';
import CategoryGamesDrawer from '@/components/CategoryGamesDrawer';
import { CategorySkeleton, HorizontalCarouselSkeleton } from '@/components/SkeletonLoader';
import { createClient } from '@/lib/supabase/client';
import { cleanAllExpiredAccess, calculateDurationExpiry, pruneExpiredAccess, isGameAccessActive } from '@/lib/access-duration';

const INITIAL_FALLBACK_GAMES: GameProduct[] = [
  {
    id: 'game-1',
    title: 'Maleo Bus Mod TZ — Shabiby Special Edition',
    description: 'High performance Tanzanian Shabiby bus mod with realistic sound engine, customized livery, and full passenger interiors.',
    cover_image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80',
    price: 3000,
    rating: 4.9,
    category: 'Maleo Bus Mods TZ',
    tags: ['Chidy Prime Mod', 'Tanzania', 'Realistic'],
    status: 'published',
  },
  {
    id: 'game-2',
    title: 'Maleo Map Mod — Dar es Salaam to Arusha Highway',
    description: 'Ultra-detailed East African highway route with authentic bus terminals, toll gates, and scenic mountain views.',
    cover_image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
    price: 2500,
    rating: 4.8,
    category: 'Maleo Map Mods TZ',
    tags: ['Map Mod', 'Tanzania', 'High Definition'],
    status: 'published',
  },
  {
    id: 'game-3',
    title: 'Need For Speed — Undercover Digital Edition',
    description: 'Full PC game download key. High-octane street racing with extreme car customization and intense police chases.',
    cover_image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    price: 2000,
    rating: 4.7,
    category: 'Racing',
    tags: ['PC Game', 'Instant Key', 'Racing'],
    status: 'published',
  },
];

export default function FrontHubPage() {
  const supabase = useMemo(() => createClient(), []);
  const [games, setGames] = useState<GameProduct[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutGame, setCheckoutGame] = useState<GameProduct | null>(null);
  const [slideshowInterval, setSlideshowInterval] = useState<number>(5000);
  const [bgSettings, setBgSettings] = useState<{ enabled: boolean; image_url: string; opacity: number }>({
    enabled: true,
    image_url: '/game_controller_bg.jpg',
    opacity: 0.45,
  });
  const [trendingConfig, setTrendingConfig] = useState<{
    enabled: boolean;
    title: string;
    subtitle: string;
    mode: 'manual' | 'auto';
    game_ids: string[];
    max_items: number;
  }>({
    enabled: true,
    title: '🔥 Hot & Trending Games',
    subtitle: 'Michezo inayopendwa zaidi sasa hivi',
    mode: 'manual',
    game_ids: [],
    max_items: 8,
  });
  const [unlockedGameIds, setUnlockedGameIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return cleanAllExpiredAccess();
      } catch {}
    }
    return new Set();
  });

  // Loading & Category Drawer States
  const [loading, setLoading] = useState(true);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [selectedDrawerCategory, setSelectedDrawerCategory] = useState<string | null>(null);

  // ── Registration & Unlocked Purchase State ──
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Monitor scroll boundaries
  const updateScrollBoundaries = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  useEffect(() => {
    updateScrollBoundaries();
    window.addEventListener('resize', updateScrollBoundaries);
    return () => window.removeEventListener('resize', updateScrollBoundaries);
  }, [updateScrollBoundaries]);

  // Load registration and unlocked games from localStorage & Supabase
  useEffect(() => {
    const syncUserAuthAndVault = async () => {
      try {
        const savedReg = localStorage.getItem('cpcg_registered');
        let userPhone = localStorage.getItem('cpcg_user_phone') || '';
        let registeredUser = localStorage.getItem('cpcg_user_name') || '';

        if (savedReg) {
          try {
            const parsed = JSON.parse(savedReg);
            if (!userPhone && parsed?.phone) userPhone = parsed.phone;
            if (!registeredUser && parsed?.name) registeredUser = parsed.name;
          } catch {}
        }

        if (registeredUser) {
          setIsRegistered(true);
          setRegisteredName(registeredUser);
        }

        // 1. Immediately read and restore only active (unexpired) local storage caches
        const newUnlocked = cleanAllExpiredAccess();

        if (newUnlocked.size > 0) {
          setUnlockedGameIds(new Set(newUnlocked));
        }

        if (!userPhone) {
          if (!registeredUser) {
            setIsRegistered(false);
            setRegisteredName('');
          }
          return;
        }

        const digits = userPhone.replace(/\D/g, '');
        const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
        const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;
        const phoneCore = clean.length >= 9 ? clean.slice(-9) : digits;
        const now = Date.now();

        // 2. Check payment_orders table with strict duration validation
        try {
          const { data: legacyData } = await supabase
            .from('payment_orders')
            .select('post_id, created_at, posts(id, duration_days, access_duration, plan_duration)')
            .or(`phone_number.eq.${clean},phone_number.eq.${local},phone_number.ilike.%${phoneCore}%`)
            .in('status', ['approved', 'completed', 'paid']);

          if (legacyData && legacyData.length > 0) {
            legacyData.forEach((d: any) => {
              if (!d.post_id) return;
              const post = d.posts || {};
              const rawDur =
                post.access_duration ||
                post.plan_duration ||
                post.duration_days;
              const exp = calculateDurationExpiry(rawDur, new Date(d.created_at));
              if (exp && new Date(exp).getTime() <= now) {
                // EXPIRED! Do NOT unlock!
                return;
              }
              newUnlocked.add(String(d.post_id));
            });
          }
        } catch {}

        // 3. Check orders table with strict duration validation
        try {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('game_id, product_id, created_at, access_duration, access_expires_at')
            .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local},phone_number.ilike.%${phoneCore}%`)
            .in('status', ['approved', 'completed', 'paid']);

          if (ordersData && ordersData.length > 0) {
            ordersData.forEach((o: any) => {
              const targetId = o.game_id || o.product_id;
              if (!targetId) return;
              if (o.access_expires_at) {
                if (new Date(o.access_expires_at).getTime() <= now) return; // Expired
              } else if (o.access_duration) {
                const exp = calculateDurationExpiry(o.access_duration, new Date(o.created_at));
                if (exp && new Date(exp).getTime() <= now) return; // Expired
              }
              newUnlocked.add(String(targetId));
            });
          }
        } catch {}

        setUnlockedGameIds(newUnlocked);
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(newUnlocked)));
      } catch (e) {
        console.warn('syncUserAuthAndVault notice:', e);
      }
    };

    syncUserAuthAndVault();

    const handleLogout = () => {
      setIsRegistered(false);
      setRegisteredName('');
      setUnlockedGameIds(new Set());
      localStorage.removeItem('cpcg_unlocked_games');
    };

    const handleOrderUnlockedEvent = (e: any) => {
      const detail = e?.detail;
      const targetId = detail?.game_id || detail?.productId || detail?.product_id;
      const status = String(detail?.status || '').toLowerCase();
      const isExplicitApproved = ['completed', 'approved', 'paid', 'success', 'unlocked'].includes(status) || detail?.isApproved === true || detail?.unlocked === true;

      // STRICT PAYWALL: Only unlock on verified approval
      if (targetId && isExplicitApproved) {
        setUnlockedGameIds((prev) => {
          const next = new Set(prev);
          next.add(String(targetId));
          localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
          return next;
        });
      }
    };

    const handleAccessExpired = (e: any) => {
      const gId = e?.detail?.gameId;
      if (gId) {
        setUnlockedGameIds((prev) => {
          const next = new Set(prev);
          next.delete(String(gId));
          localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
          return next;
        });
      }
    };

    // Periodic sweep every 15 seconds to purge expired items while page is open
    const sweepInterval = setInterval(() => {
      const refreshed = cleanAllExpiredAccess();
      setUnlockedGameIds((prev) => {
        if (prev.size !== refreshed.size) return refreshed;
        const prevArray = Array.from(prev);
        const hasDiff = prevArray.some((id) => !refreshed.has(id));
        return hasDiff ? refreshed : prev;
      });
    }, 15000);

    window.addEventListener('cpcg_auth_change', syncUserAuthAndVault);
    window.addEventListener('cpcg_logout_reset', handleLogout);
    window.addEventListener('cpcg_order_unlocked', handleOrderUnlockedEvent);
    window.addEventListener('cpcg_access_expired', handleAccessExpired);

    return () => {
      clearInterval(sweepInterval);
      window.removeEventListener('cpcg_auth_change', syncUserAuthAndVault);
      window.removeEventListener('cpcg_logout_reset', handleLogout);
      window.removeEventListener('cpcg_order_unlocked', handleOrderUnlockedEvent);
      window.removeEventListener('cpcg_access_expired', handleAccessExpired);
    };
  }, [supabase]);

  const handleCheckoutSuccess = (order: any) => {
    if (order?.game_id) {
      setUnlockedGameIds((prev) => {
        const next = new Set(prev);
        next.add(order.game_id);
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
        return next;
      });
    }
  };

  const handleRegistrationSuccess = (name: string, phone: string) => {
    localStorage.setItem('cpcg_registered', JSON.stringify({ name, phone }));
    localStorage.setItem('cpcg_user_phone', phone);
    localStorage.setItem('cpcg_user_name', name);
    setIsRegistered(true);
    setRegisteredName(name);
    setShowRegisterModal(false);
    setShowCelebration(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cpcg_auth_change'));
    }
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const loadStorefrontData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // Fetch Real Products / Games from Supabase 'posts' table
      let postsData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.warn('Supabase posts fetch warning:', error.message);
        postsData = data;
      } catch (e) {
        console.error('Failed to fetch from posts:', e);
      }

      const combined: GameProduct[] = [];

      // Process posts table
      if (postsData && postsData.length > 0) {
        postsData.forEach((p) => {
          if (p.status === 'draft' || p.status === 'archived') return;
          
          let dur = p.plan_duration || p.access_duration || p.license_duration || p.duration;
          if (!dur && p.duration_days !== undefined && p.duration_days !== null) {
            if (p.duration_days === 2) dur = '2 Hours';
            else if (p.duration_days === 1 || p.duration_days === 24) dur = '24 Hours';
            else if (p.duration_days === 7) dur = '7 Days';
            else if (p.duration_days === 30) dur = '30 Days';
            else if (p.duration_days === 0) dur = 'Lifetime';
            else dur = `${p.duration_days} Days`;
          }

          let rawCover = p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
          let rawScreenshots: string[] = [];
          let rawVideoUrl = p.youtube_url || p.video_url || '';
          let thumbnailType: 'image' | 'slideshow' | 'video' | 'auto' = p.thumbnail_type || (rawVideoUrl ? 'video' : 'auto');

          // Resilient parsing if JSON was stored in image_url or screenshots
          if (typeof rawCover === 'string' && rawCover.trim().startsWith('{')) {
            try {
              const parsedMedia = JSON.parse(rawCover);
              rawCover = parsedMedia.image || parsedMedia.cover || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
              if (Array.isArray(parsedMedia.screenshots)) rawScreenshots = parsedMedia.screenshots;
              if (parsedMedia.video) rawVideoUrl = parsedMedia.video;
              if (parsedMedia.thumbnail_type) thumbnailType = parsedMedia.thumbnail_type;
            } catch (e) {}
          }

          if (Array.isArray(p.screenshots)) {
            rawScreenshots = p.screenshots;
          } else if (typeof p.screenshots === 'string' && p.screenshots.trim()) {
            if (p.screenshots.trim().startsWith('[')) {
              try {
                rawScreenshots = JSON.parse(p.screenshots);
              } catch (e) {}
            } else {
              rawScreenshots = p.screenshots.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }

          let directPaymentUrl = p.direct_payment_url || '';
          let thumbnailFit = p.thumbnail_fit || 'cover';
          let cleanLinks: any[] = [];
          if (Array.isArray(p.links)) {
            p.links.forEach((l: any) => {
              if (l && (l.name === 'DIRECT_PAYMENT_URL' || l.name === 'PAYMENT_REDIRECT')) {
                if (!directPaymentUrl && l.url) directPaymentUrl = l.url;
              } else if (l && l.name === 'THUMBNAIL_FIT') {
                if (!p.thumbnail_fit && (l.value || l.url)) thumbnailFit = l.value || l.url;
              } else if (l && l.url) {
                cleanLinks.push(l);
              }
            });
          }

          combined.push({
            id: p.id,
            title: p.title || 'Untitled Game',
            description: p.description || '',
            cover_image: rawCover,
            screenshots: rawScreenshots,
            video_url: rawVideoUrl,
            youtube_url: rawVideoUrl,
            thumbnail_type: thumbnailType,
            thumbnail_fit: thumbnailFit,
            price: Number(p.price || 0),
            rating: Number(p.rating || 4.9),
            category: p.category || 'Maleo Bus Mods TZ',
            tags: ['Chidy Prime Mod', 'Tanzania'],
            status: p.status || 'published',
            is_new_feed: Boolean(p.is_new_feed),
            download_url: cleanLinks[0]?.url || (Array.isArray(p.links) && p.links[0]?.url) || p.download_url,
            links: cleanLinks.length > 0 ? cleanLinks : (p.links || []),
            direct_payment_url: directPaymentUrl,
            access_duration: dur || 'Lifetime',
            license_duration: dur || 'Lifetime',
            plan_duration: dur || 'Lifetime',
          } as any);
        });
      }

      // Fallback if no games in database to populate initial setup
      setGames(combined.length > 0 ? combined : INITIAL_FALLBACK_GAMES);

      // Load CMS Hero Slides (with dual-layer fallback)
      try {
        const res = await fetch('/api/admin/cms/slides');
        const data = await res.json();
        if (data.success && Array.isArray(data.slides) && data.slides.length > 0) {
          const activeSlides = data.slides.filter((s: any) => s.is_active !== false);
          if (activeSlides.length > 0) {
            setSlides(activeSlides);
          }
        }
      } catch (err) {
        console.error('Failed to load slides:', err);
      }

      // Load CMS Category Cards
      try {
        const { data: categoriesData, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true });
        if (error) throw error;

        // Fetch category metadata from store_settings
        let metadata: any = {};
        try {
          const { data: settingsData } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'category_metadata')
            .single();
          if (settingsData?.value) {
            metadata = settingsData.value;
          }
        } catch (metaErr) {
          console.warn('Failed to load category_metadata from store_settings:', metaErr);
        }

        if (categoriesData && categoriesData.length > 0) {
          const merged = categoriesData.map((cat: any) => {
            const meta = metadata[cat.name] || {};
            return {
              ...cat,
              image_url: meta.image_url || '',
              description: meta.description || '',
              badge_text: meta.badge_text || 'MODS & GAMES',
            };
          });
          setCategories(merged);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }

      // Load Store Background Settings
      try {
        const { data: settingsData, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'custom_background')
          .single();
        if (!error && settingsData?.value) {
          setBgSettings({
            enabled: settingsData.value.enabled ?? true,
            image_url: settingsData.value.image_url || '/game_controller_bg.jpg',
            opacity: settingsData.value.opacity ?? 0.45,
          });
        }
      } catch (err) {
        console.error('Failed to load custom background:', err);
      }

      // Load Slideshow Duration Settings
      try {
        const { data: slideshowData, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'slideshow_settings')
          .single();
        if (!error && slideshowData?.value) {
          const { duration, unit } = slideshowData.value;
          let ms = 5000;
          if (unit === 'seconds') ms = duration * 1000;
          else if (unit === 'minutes') ms = duration * 60 * 1000;
          else if (unit === 'days') ms = duration * 24 * 60 * 60 * 1000;
          setSlideshowInterval(ms);
        }
      } catch (err) {
        console.error('Failed to load slideshow interval:', err);
      }

      // Load Custom Trending Games Settings
      try {
        const { data: trendingData, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'trending_games')
          .single();
        if (!error && trendingData?.value) {
          const val = trendingData.value;
          if (Array.isArray(val)) {
            setTrendingConfig((prev) => ({
              ...prev,
              game_ids: val,
              enabled: true,
            }));
          } else if (typeof val === 'object' && val !== null) {
            setTrendingConfig({
              enabled: val.enabled !== false,
              title: val.title || '🔥 Hot & Trending Games',
              subtitle: val.subtitle || 'Michezo inayopendwa zaidi sasa hivi',
              mode: val.mode || 'manual',
              game_ids: Array.isArray(val.game_ids) ? val.game_ids : [],
              max_items: Number(val.max_items) || 8,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load trending games:', err);
      }
    } catch (err) {
      console.error('Failed to load storefront CMS data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStorefrontData(true);

    // ── HELPER TO NORMALIZE REALTIME GAME PAYLOAD ──
    const formatRealtimeGame = (raw: any): GameProduct => {
      let dur = raw.plan_duration || raw.access_duration || raw.license_duration || raw.duration;
      if (!dur && raw.duration_days !== undefined && raw.duration_days !== null) {
        if (raw.duration_days === 2) dur = '2 Hours';
        else if (raw.duration_days === 1 || raw.duration_days === 24) dur = '24 Hours';
        else if (raw.duration_days === 7) dur = '7 Days';
        else if (raw.duration_days === 30) dur = '30 Days';
        else if (raw.duration_days === 0) dur = 'Lifetime';
        else dur = `${raw.duration_days} Days`;
      }
      let linksList: { name: string; url: string }[] = [];
      if (Array.isArray(raw.links)) {
        linksList = raw.links.map((l: any) => ({
          name: l.name || l.label || 'Download File',
          url: l.url || '',
        }));
      } else if (Array.isArray(raw.download_links)) {
        linksList = raw.download_links.map((l: any) => ({
          name: l.name || l.label || 'Download File',
          url: l.url || '',
        }));
      } else if (raw.download_url) {
        linksList = [{ name: 'Download File', url: raw.download_url }];
      }

      return {
        id: raw.id,
        title: raw.title || 'Untitled Game',
        description: raw.description || '',
        cover_image: raw.image_url || raw.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
        price: Number(raw.price || 0),
        rating: Number(raw.rating || 4.9),
        category: raw.category || 'MALEO BUS MODE TZ',
        tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : ['Chidy Prime Mod', 'Tanzania'],
        status: raw.status || 'published',
        is_new_feed: Boolean(raw.is_new_feed),
        download_url: linksList[0]?.url || raw.download_url || '',
        links: linksList,
        access_duration: dur || 'Lifetime',
        license_duration: dur || 'Lifetime',
      } as any;
    };

    const handleProductChange = (payload: any) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const isLive = payload.new.status !== 'draft' && payload.new.status !== 'archived' && payload.new.status !== 'hidden' && payload.new.is_active !== false;
        if (isLive) {
          const newGame = formatRealtimeGame(payload.new);
          setGames((prev) => [newGame, ...prev.filter((g) => g.id !== newGame.id)]);
        }
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const isLive = payload.new.status !== 'draft' && payload.new.status !== 'archived' && payload.new.status !== 'hidden' && payload.new.is_active !== false;
        if (!isLive) {
          setGames((prev) => prev.filter((g) => g.id !== payload.new.id));
        } else {
          const updatedGame = formatRealtimeGame(payload.new);
          setGames((prev) => {
            const exists = prev.some((g) => g.id === updatedGame.id);
            if (!exists) return [updatedGame, ...prev];
            return prev.map((g) => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g));
          });
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setGames((prev) => prev.filter((g) => g.id !== payload.old.id));
      }
    };

    // ── SUPABASE REALTIME WEBSOCKET LISTENER FOR ZERO-PAGE-RELOAD SYNC ──
    const channel = supabase
      .channel('cross-domain-storefront-sync')
      .on(
        'broadcast',
        { event: 'STOREFRONT_DATA_CHANGED' },
        () => {
          loadStorefrontData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        handleProductChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        handleProductChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        handleProductChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          loadStorefrontData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_orders' },
        (payload: any) => {
          const newOrder = payload.new;
          if (!newOrder) return;
          const status = (newOrder.status || '').toLowerCase();
          const targetGameId = newOrder.post_id || newOrder.game_id;
          if (['completed', 'approved', 'paid'].includes(status) && targetGameId) {
            try {
              const currentPhone = (localStorage.getItem('cpcg_user_phone') || '').replace(/\D/g, '');
              const orderPhone = (newOrder.phone_number || newOrder.visitor_phone || '').replace(/\D/g, '');
              if (!currentPhone || currentPhone === orderPhone || orderPhone.endsWith(currentPhone.slice(-9))) {
                setUnlockedGameIds((prev) => {
                  const next = new Set(prev);
                  next.add(targetGameId);
                  localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
                  return next;
                });
              }
            } catch (e) {}
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slides' },
        () => {
          loadStorefrontData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          loadStorefrontData(false);
        }
      )
      .subscribe();

    // ── SUPABASE BROADCAST LISTENER FOR INSTANT MANUAL ADMIN APPROVAL ──
    const broadcastChannel = supabase
      .channel('order-updates-storefront')
      .on(
        'broadcast',
        { event: 'ORDER_APPROVED' },
        (payload: any) => {
          const data = payload?.payload || payload;
          if (!data) return;

          const currentPhone = (localStorage.getItem('cpcg_user_phone') || '').replace(/\D/g, '');
          const orderPhone = (data.phone || '').replace(/\D/g, '');
          const activeOrderId = localStorage.getItem('cpcg_active_order_id') || '';
          const activeGameId = localStorage.getItem('cpcg_active_game_id') || '';

          const last9Current = currentPhone.slice(-9);
          const last9Order = orderPhone.slice(-9);

          const isPhoneMatch = last9Current && last9Order && last9Current === last9Order;
          const isOrderMatch = activeOrderId && (data.orderId === activeOrderId || data.orderNumber === activeOrderId);
          const isExplicitApproved = data.isApproved === true || data.status === 'approved' || data.status === 'completed' || data.status === 'UNLOCKED';

          // STRICT PAYWALL: Only unlock if explicit phone or active order match AND verified approval
          if ((isPhoneMatch || isOrderMatch) && isExplicitApproved) {
            const targetProductId = data.productId;
            if (targetProductId) {
              setUnlockedGameIds((prev) => {
                const next = new Set(prev);
                next.add(String(targetProductId));
                localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
                return next;
              });
            }

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('cpcg_order_unlocked', { detail: data }));
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'STORE_SETTINGS_UPDATED' },
        (payload: any) => {
          const setting = payload?.payload;
          if (setting?.key === 'custom_background' && setting.value) {
            setBgSettings({
              enabled: setting.value.enabled !== false,
              image_url: setting.value.image_url || '/game_controller_bg.jpg',
              opacity: setting.value.opacity ?? 0.45,
            });
          }
          if (setting?.key === 'trending_games' && setting.value) {
            const val = setting.value;
            if (Array.isArray(val)) {
              setTrendingConfig((prev) => ({
                ...prev,
                game_ids: val,
                enabled: true,
              }));
            } else if (typeof val === 'object' && val !== null) {
              setTrendingConfig({
                enabled: val.enabled !== false,
                title: val.title || '🔥 Hot & Trending Games',
                subtitle: val.subtitle || 'Michezo inayopendwa zaidi sasa hivi',
                mode: val.mode || 'manual',
                game_ids: Array.isArray(val.game_ids) ? val.game_ids : [],
                max_items: Number(val.max_items) || 8,
              });
            }
          }
        }
      )
      .subscribe();

    const handleGlobalSync = () => {
      loadStorefrontData(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cpcg_storefront_sync', handleGlobalSync);
    }

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('cpcg_storefront_sync', handleGlobalSync);
      }
    };
  }, [loadStorefrontData, supabase]);



  const handleBuyNow = (game: GameProduct) => {
    setCheckoutGame(game);
  };

  // Filter Hot & Trending games (with dynamic config, mode, and max count)
  const trendingGames = useMemo(() => {
    if (!trendingConfig.enabled) return [];

    const limit = trendingConfig.max_items || 8;

    if (trendingConfig.mode === 'manual' && Array.isArray(trendingConfig.game_ids) && trendingConfig.game_ids.length > 0) {
      const picked = trendingConfig.game_ids
        .map((id) => (games ?? []).find((g) => g?.id === id))
        .filter(Boolean) as GameProduct[];
      if (picked.length > 0) {
        return picked.slice(0, limit);
      }
    }

    // Fallback or Auto mode: sort by rating / popularity
    return [...(games ?? [])]
      .sort((a, b) => (Number(b?.rating) || 0) - (Number(a?.rating) || 0))
      .slice(0, limit);
  }, [games, trendingConfig]);

  // Scroll horizontal carousel by exactly one viewport step
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (typeof window === 'undefined' || !carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth || 300;
    const delta = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: delta,
      behavior: 'smooth',
    });
    setTimeout(updateScrollBoundaries, 350);
  };

  const categoryListWithCounts = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return undefined;
    return categories.map((cat) => {
      const fc = (cat?.name || '').toLowerCase().replace(/s$/i, '').trim();
      const count = (games ?? []).filter((g) => {
        if (!g?.category) return false;
        const gc = String(g.category).toLowerCase().replace(/s$/i, '').trim();
        return gc === fc || gc.includes(fc) || fc.includes(gc);
      }).length;

      return {
        ...cat,
        game_count: count,
      };
    });
  }, [categories, games]);

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar
        onSearchChange={(q) => setSearchQuery(q)}
        games={games}
      />

      <main className="main-storefront-wrapper relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:pt-8 md:pb-8 space-y-8 sm:space-y-10">
        {/* Style Tag to hide scrollbars cleanly */}
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        {/* Hero Slideshow Section */}
        {loading ? (
          <div className="w-full h-[340px] bg-slate-900 border border-slate-800 animate-pulse rounded-3xl" />
        ) : (
          <HeroSlideshow 
            slides={slides.length > 0 ? slides : undefined} 
            intervalMs={slideshowInterval}
          />
        )}

        {/* ── Hot & Trending Horizontal Scroll Section ── */}
        {loading ? (
          <HorizontalCarouselSkeleton />
        ) : (
          trendingConfig.enabled && trendingGames.length > 0 && (
            <section className="w-full space-y-6">
              <div 
                className="flex items-center justify-between p-4 border border-slate-800 rounded-2xl bg-slate-900 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md"
                  >
                    <Flame className="w-6 h-6 text-white fill-white animate-pulse" />
                  </div>
                  <div>
                    <h2 
                      className="text-base sm:text-xl font-black text-white tracking-tight uppercase leading-none"
                    >
                      {trendingConfig.title || '🔥 Hot & Trending Games'}
                    </h2>
                    <p 
                      className="text-xs text-blue-400 font-bold mt-1.5"
                    >
                      {trendingConfig.subtitle || 'Michezo inayopendwa zaidi sasa hivi'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollCarousel('left')}
                    disabled={!canScrollLeft}
                    className={`min-w-[44px] min-h-[44px] rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-all shadow-sm ${
                      canScrollLeft
                        ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer'
                        : 'text-slate-600 opacity-30 pointer-events-none cursor-not-allowed'
                    }`}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    disabled={!canScrollRight}
                    className={`min-w-[44px] min-h-[44px] rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-all shadow-sm ${
                      canScrollRight
                        ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer'
                        : 'text-slate-600 opacity-30 pointer-events-none cursor-not-allowed'
                    }`}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Touch-swipe horizontal container with scroll containment and boundary locking */}
              <div
                ref={carouselRef}
                onScroll={updateScrollBoundaries}
                className="category-slider-track flex gap-4 sm:gap-5 overflow-x-auto py-2 px-1 snap-x snap-mandatory touch-pan-x"
                style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
              >
                {(trendingGames ?? []).map((game, idx) => (
                  <div key={game?.id || idx} className="game-card-item w-[260px] sm:w-[280px] shrink-0 snap-start">
                    <GameCard
                      game={game}
                      onBuyNow={handleBuyNow}
                      index={idx}
                      isUnlocked={game?.id ? unlockedGameIds.has(game.id) : false}
                    />
                  </div>
                ))}
                {/* Spacer at the end of flex list */}
                <div className="w-4 sm:w-6 shrink-0" />
              </div>
            </section>
          )
        )}

        {/* ── Main View (Search Mode or Visual Category Vault Cards) ── */}
        {searchQuery.trim().length > 0 ? (
          /* Search results vault mode */
          <GameCatalog
            games={games}
            categories={categories}
            searchQuery={searchQuery}
            fixedCategory={null}
            onBuyNow={handleBuyNow}
            unlockedGameIds={unlockedGameIds}
            onBack={() => {
              setSearchQuery('');
            }}
          />
        ) : (
          /* Visual Categories Vault Cards (Original Clean Homepage) */
          loading ? (
            <section className="space-y-6">
              <div className="h-16 bg-slate-900 border border-slate-800 animate-pulse rounded-2xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            </section>
          ) : (
            <CategoryGrid
              categories={categoryListWithCounts}
              selectedCategory={selectedCategory}
              isRegistered={isRegistered}
              onRegisterClick={() => setShowRegisterModal(true)}
              onSelectCategory={(catName) => {
                setSelectedDrawerCategory(catName);
                setCategoryDrawerOpen(true);
                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                  const sectionEl = document.getElementById('category-vault-section');
                  if (sectionEl) {
                    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }}
            />
          )
        )}
      </main>

      {/* Slide-over Category Drawer */}
      <CategoryGamesDrawer
        isOpen={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        categoryName={selectedDrawerCategory}
        games={games}
        onBuyNow={handleBuyNow}
        unlockedGameIds={unlockedGameIds}
      />

      {checkoutGame && (
        <CheckoutModal
          isOpen={!!checkoutGame}
          onClose={() => setCheckoutGame(null)}
          game={checkoutGame}
          isUnlocked={checkoutGame?.id ? unlockedGameIds.has(checkoutGame.id) : false}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      <CelebrationPopup
        isVisible={showCelebration}
        userName={registeredName}
      />
    </>
  );
}
