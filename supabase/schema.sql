-- ==========================================
-- CHIDYPRIME DIGITAL GAME STORE DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL & RLS
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 1. PROFILES TABLE (User Roles & Auth Sync)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to create profile when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------
-- 2. GAMES CATALOG TABLE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT NOT NULL,
    screenshots TEXT[] DEFAULT '{}',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    rating NUMERIC(3, 2) DEFAULT 4.80,
    category TEXT NOT NULL DEFAULT 'PC Games',
    tags TEXT[] DEFAULT '{}',
    system_req_minimum JSONB DEFAULT '{"os": "Windows 10 64-bit", "cpu": "Intel Core i5-4460", "ram": "8 GB RAM", "gpu": "NVIDIA GTX 960", "storage": "50 GB free space"}'::jsonb,
    system_req_recommended JSONB DEFAULT '{"os": "Windows 11 64-bit", "cpu": "Intel Core i7-8700K", "ram": "16 GB RAM", "gpu": "NVIDIA RTX 2070", "storage": "50 GB SSD"}'::jsonb,
    download_url TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT FALSE,
    is_hero BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant search performance
CREATE INDEX IF NOT EXISTS idx_games_title ON public.games USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_games_category ON public.games(category);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);

-- View bridging existing `posts` table with `games` table for backwards compatibility
CREATE OR REPLACE VIEW public.v_store_games AS
SELECT 
    id,
    title,
    description,
    image_url AS cover_image,
    price,
    category,
    rating,
    status,
    created_at
FROM public.posts
WHERE status = 'published'
UNION ALL
SELECT 
    id,
    title,
    description,
    cover_image,
    price,
    category,
    rating,
    status,
    created_at
FROM public.games
WHERE status = 'published';

-- ------------------------------------------
-- 3. DIGITAL ACTIVATION KEYS TABLE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    key_code TEXT NOT NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- 4. ORDERS & TRANSACTIONS TABLE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL DEFAULT ('ORD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))),
    visitor_phone TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    game_title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TZS',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_gateway TEXT NOT NULL DEFAULT 'pressopay',
    transaction_ref TEXT,
    download_token TEXT UNIQUE DEFAULT MD5(RANDOM()::TEXT || NOW()::TEXT),
    token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    activation_key TEXT,
    download_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(visitor_phone);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(download_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ------------------------------------------
-- 5. HERO SLIDESHOW TABLE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    cta_text TEXT DEFAULT 'Buy Now & Play',
    cta_link TEXT,
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------
-- 6. STORE SETTINGS TABLE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default store settings insert
INSERT INTO public.store_settings (key, value)
VALUES 
    ('custom_background', '{"enabled": false, "image_url": "", "opacity": 0.35}'::jsonb),
    ('slideshow_speed', '{"interval_ms": 4000, "autoplay": true}'::jsonb),
    ('payment_gateways', '{"pressopay_enabled": true, "mpesa_enabled": true, "harakapay_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by owner or admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- GAMES POLICIES
CREATE POLICY "Published games viewable by everyone"
    ON public.games FOR SELECT
    USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins full CRUD on games"
    ON public.games FOR ALL
    USING (public.is_admin());

-- GAME KEYS POLICIES
CREATE POLICY "Admins full access to keys"
    ON public.game_keys FOR ALL
    USING (public.is_admin());

-- ORDERS POLICIES
CREATE POLICY "Users view own orders or by download token"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin() OR download_token IS NOT NULL);

CREATE POLICY "Anyone can create order"
    ON public.orders FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

-- HERO SLIDES POLICIES
CREATE POLICY "Hero slides viewable by everyone"
    ON public.hero_slides FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins full access hero slides"
    ON public.hero_slides FOR ALL
    USING (public.is_admin());

-- STORE SETTINGS POLICIES
CREATE POLICY "Store settings viewable by everyone"
    ON public.store_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can update store settings"
    ON public.store_settings FOR ALL
    USING (public.is_admin());
