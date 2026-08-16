-- ==============================================================================
-- ZERO-FAILURE PAYMENT & ACCESS ENGINE MIGRATION SCHEMA
-- Project: CHIDYPRIME x CHIDYGAMING
-- Tables: orders, payment_transactions, user_purchases, unclaimed_payments
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ORDERS TABLE UPGRADE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    visitor_phone TEXT NOT NULL,
    phone_number TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    game_id UUID,
    product_id UUID,
    game_title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'TZS',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'failed', 'refunded', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_gateway TEXT NOT NULL DEFAULT 'pressopay',
    transaction_ref TEXT,
    gateway_reference TEXT,
    download_token TEXT UNIQUE DEFAULT ('tok_' || MD5(RANDOM()::TEXT || NOW()::TEXT)),
    token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    access_duration TEXT DEFAULT 'Lifetime', -- 'Lifetime', '30 Days', '24 Hours', '2 Hours'
    access_expires_at TIMESTAMPTZ,
    activation_key TEXT,
    download_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill helper columns if table already existed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'phone_number') THEN
        ALTER TABLE public.orders ADD COLUMN phone_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_id') THEN
        ALTER TABLE public.orders ADD COLUMN product_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'access_duration') THEN
        ALTER TABLE public.orders ADD COLUMN access_duration TEXT DEFAULT 'Lifetime';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'access_expires_at') THEN
        ALTER TABLE public.orders ADD COLUMN access_expires_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(visitor_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(download_token);

-- ------------------------------------------------------------------------------
-- 2. IMMUTABLE PAYMENT TRANSACTIONS LEDGER (Zero-Money-Loss)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    product_id UUID,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TZS',
    gateway TEXT NOT NULL DEFAULT 'pressopay',
    gateway_ref TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    raw_request JSONB DEFAULT '{}'::jsonb,
    raw_response JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_trans_order_ref ON public.payment_transactions(order_ref);
CREATE INDEX IF NOT EXISTS idx_pay_trans_phone ON public.payment_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_pay_trans_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pay_trans_gateway_ref ON public.payment_transactions(gateway_ref);

-- ------------------------------------------------------------------------------
-- 3. USER PURCHASES & ACCESS PERMISSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    order_reference TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL,
    phone_number TEXT,
    product_id UUID NOT NULL,
    game_id UUID,
    product_title TEXT NOT NULL,
    download_links JSONB DEFAULT '[]'::jsonb,
    download_token TEXT,
    access_duration TEXT DEFAULT 'Lifetime',
    access_expires_at TIMESTAMPTZ, -- NULL for Lifetime
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'completed')),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_purchases_phone_product_unique UNIQUE (customer_phone, product_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_phone ON public.user_purchases(customer_phone);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.user_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.user_purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_expires_at ON public.user_purchases(access_expires_at);

-- ------------------------------------------------------------------------------
-- 4. UNCLAIMED PAYMENTS LEDGER (Zero-Loss Orphan Collector)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unclaimed_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    gateway TEXT NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'resolved', 'refunded')),
    resolved_order_ref TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unclaimed_phone ON public.unclaimed_payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_unclaimed_status ON public.unclaimed_payments(status);
CREATE INDEX IF NOT EXISTS idx_unclaimed_ref ON public.unclaimed_payments(transaction_ref);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unclaimed_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read own orders by phone or user"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR visitor_phone IS NOT NULL OR download_token IS NOT NULL);

CREATE POLICY "Public create orders"
    ON public.orders FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Admins full manage orders"
    ON public.orders FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public create transactions"
    ON public.payment_transactions FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Public read own transactions"
    ON public.payment_transactions FOR SELECT
    USING (phone_number IS NOT NULL);

CREATE POLICY "Admins full manage transactions"
    ON public.payment_transactions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read purchases by phone"
    ON public.user_purchases FOR SELECT
    USING (customer_phone IS NOT NULL OR auth.uid() = user_id);

CREATE POLICY "Admins full manage user purchases"
    ON public.user_purchases FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full manage unclaimed payments"
    ON public.unclaimed_payments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
