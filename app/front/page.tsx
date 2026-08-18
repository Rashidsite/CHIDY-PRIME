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
  const [trendingIds, setTrendingIds] = useState<string[]>([]);
  const [unlockedGameIds, setUnlockedGameIds] = useState<Set<string>>(new Set());

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

  // Load registration and unlocked games from localStorage
  useEffect(() => {
    const savedReg = localStorage.getItem('cpcg_registered');
    if (savedReg) {
      const parsed = JSON.parse(savedReg);
      setIsRegistered(true);
      setRegisteredName(parsed.name || '');
    }

    // 2. Fetch approved purchases from database for user phone
    try {
      const userPhone = localStorage.getItem('cpcg_user_phone') || (savedReg ? JSON.parse(savedReg).phone : null);
      if (userPhone) {
        const digits = userPhone.replace(/\D/g, '');
        const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
        const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;
        supabase
          .from('payment_orders')
          .select('post_id')
          .or(`phone_number.eq.${clean},phone_number.eq.${local}`)
          .in('status', ['approved', 'completed', 'paid'])
          .then(({ data }) => {
            if (data && data.length > 0) {
              setUnlockedGameIds((prev) => {
                const next = new Set(prev);
                data.forEach((d) => d.post_id && next.add(d.post_id));
                localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
                return next;
              });
            }
          });
      }
    } catch (e) {}
  }, []);

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
    setIsRegistered(true);
    setRegisteredName(name);
    setShowRegisterModal(false);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const supabase = createClient();

  const loadStorefrontData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // 1. Fetch Real Games from Supabase 'games' table
      let gamesData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.warn('Supabase games fetch warning:', error.message);
        gamesData = data;
      } catch (e) {
        console.error('Failed to fetch from games:', e);
      }

      // 2. Fetch Real Posts from Supabase 'posts' table
      let postsData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(0, 5000);
        if (error) console.warn('Supabase posts fetch warning:', error.message);
        postsData = data;
      } catch (e) {
        console.error('Failed to fetch from posts:', e);
      }

      const combined: GameProduct[] = [];

      if (gamesData && gamesData.length > 0) {
        gamesData.forEach((g) => {
          combined.push({
            id: g.id,
            title: g.title,
            description: g.description,
            cover_image: g.cover_image || g.image_url || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
            price: g.price || 0,
            rating: g.rating || 4.9,
            category: g.category || 'Maleo Bus Mods TZ',
            tags: g.tags || ['Chidy Prime Mod', 'Tanzania'],
            status: g.status || 'published',
            download_url: g.download_url,
          });
        });
      }

      if (postsData && postsData.length > 0) {
        const existingIds = new Set(combined.map((c) => c.id));
        postsData.forEach((p) => {
          if (!existingIds.has(p.id)) {
            combined.push({
              id: p.id,
              title: p.title,
              description: p.description,
              cover_image: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
              price: p.price || 0,
              rating: p.rating || 4.9,
              category: p.category || 'Maleo Bus Mods TZ',
              tags: ['Chidy Prime Mod', 'Tanzania'],
              status: p.status || 'published',
              download_url: p.download_url,
            });
          }
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
          setTrendingIds(trendingData.value);
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

    // ── SUPABASE REALTIME WEBSOCKET LISTENER FOR REAL-TIME STOREFRONT SYNC ──
    const channel = supabase
      .channel('public-storefront-posts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload: any) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new;
            setGames((prev) =>
              prev.map((g) =>
                g.id === updated.id
                  ? {
                      ...g,
                      title: updated.title ?? g.title,
                      price: updated.price !== undefined ? Number(updated.price) : g.price,
                      category: updated.category ?? g.category,
                      cover_image: updated.image_url || updated.cover_image || g.cover_image,
                      rating: updated.rating ?? g.rating,
                      download_url: (Array.isArray(updated.links) && updated.links[0]?.url) || updated.download_url || g.download_url,
                    }
                  : g
              )
            );
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const newGame: GameProduct = {
              id: payload.new.id,
              title: payload.new.title,
              description: payload.new.description,
              cover_image: payload.new.image_url || payload.new.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
              price: Number(payload.new.price || 0),
              rating: Number(payload.new.rating || 4.9),
              category: payload.new.category || 'MALEO BUS MODE TZ',
              tags: ['Chidy Prime Mod', 'Tanzania'],
              status: payload.new.status || 'published',
              download_url: (Array.isArray(payload.new.links) && payload.new.links[0]?.url) || payload.new.download_url,
            };
            setGames((prev) => [newGame, ...prev.filter((x) => x.id !== newGame.id)]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setGames((prev) => prev.filter((g) => g.id !== payload.old.id));
          }
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

    return () => {
      supabase.removeChannel(channel);
    };

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
          const isGameMatch = activeGameId && data.productId === activeGameId;

          if (isPhoneMatch || isOrderMatch || isGameMatch || !currentPhone) {
            const targetProductId = data.productId || activeGameId;
            if (targetProductId) {
              setUnlockedGameIds((prev) => {
                const next = new Set(prev);
                next.add(targetProductId);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [loadStorefrontData, supabase]);



  const handleBuyNow = (game: GameProduct) => {
    setCheckoutGame(game);
  };

  // Filter Hot & Trending games (6-8 items with high ratings, or manually selected ones)
  const trendingGames = useMemo(() => {
    if (trendingIds && trendingIds.length > 0) {
      return trendingIds
        .map((id) => games.find((g) => g.id === id))
        .filter(Boolean) as GameProduct[];
    }
    return [...games]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);
  }, [games, trendingIds]);

  // Scroll horizontal carousel
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollAmount = clientWidth * 0.75;
      carouselRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const categoryListWithCounts = useMemo(() => {
    if (categories.length === 0) return undefined;
    return categories.map((cat) => {
      const fc = cat.name.toLowerCase().replace(/s$/i, '').trim();
      const count = games.filter((g) => {
        if (!g.category) return false;
        const gc = g.category.toLowerCase().replace(/s$/i, '').trim();
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
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
          trendingGames.length > 0 && (
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
                      🔥 Hot & Trending Games
                    </h2>
                    <p 
                      className="text-xs text-blue-400 font-bold mt-1.5"
                    >
                      Michezo inayopendwa zaidi sasa hivi
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Touch-swipe horizontal container with clean padding to prevent clipping */}
              <div
                ref={carouselRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto py-2 px-1 no-scrollbar snap-x snap-mandatory touch-pan-x"
                style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
              >
                {trendingGames.map((game, idx) => (
                  <div key={game.id} className="w-[210px] sm:w-[240px] md:w-[260px] shrink-0 snap-start">
                    <GameCard
                      game={game}
                      onBuyNow={handleBuyNow}
                      index={idx}
                      isUnlocked={unlockedGameIds.has(game.id)}
                    />
                  </div>
                ))}
                {/* Spacer at the end of flex list */}
                <div className="w-4 sm:w-6 shrink-0" />
              </div>
            </section>
          )
        )}

        {/* ── Main View (Grid or Search Results) ── */}
        {searchQuery.trim().length > 0 ? (
          /* Search results vault mode */
          <GameCatalog
            games={games}
            searchQuery={searchQuery}
            fixedCategory={null}
            onBuyNow={handleBuyNow}
            unlockedGameIds={unlockedGameIds}
            onBack={() => {
              setSearchQuery('');
            }}
          />
        ) : (
          /* Standard categories catalog mode */
          loading ? (
            <section className="space-y-6">
              <div className="h-16 bg-black border-2 border-emerald-500/20 animate-pulse rounded-2xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
