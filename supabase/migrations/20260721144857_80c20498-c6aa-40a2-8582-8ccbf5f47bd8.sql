
-- Add 'rider' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rider';

-- Extend orders with delivery/rider fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_code text,
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rider_commission_pct numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS rider_commission_leones integer;

-- Riders table
CREATE TABLE IF NOT EXISTS public.riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text NOT NULL,
  vehicle text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.riders TO authenticated;
GRANT ALL ON public.riders TO service_role;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "riders read own" ON public.riders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "riders upsert own" ON public.riders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "riders update own" ON public.riders FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Rider live locations
CREATE TABLE IF NOT EXISTS public.rider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rider_locations_order_idx ON public.rider_locations(order_id, updated_at DESC);
GRANT SELECT, INSERT ON public.rider_locations TO authenticated;
GRANT SELECT ON public.rider_locations TO anon;
GRANT ALL ON public.rider_locations TO service_role;
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc rider insert" ON public.rider_locations FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid());
CREATE POLICY "loc public read by order" ON public.rider_locations FOR SELECT TO anon USING (order_id IS NOT NULL);
CREATE POLICY "loc auth read by order" ON public.rider_locations FOR SELECT TO authenticated USING (true);

-- Rider payouts ledger
CREATE TABLE IF NOT EXISTS public.rider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_leones integer NOT NULL,
  status text NOT NULL DEFAULT 'owed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
GRANT SELECT ON public.rider_payouts TO authenticated;
GRANT ALL ON public.rider_payouts TO service_role;
ALTER TABLE public.rider_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts read own or admin" ON public.rider_payouts FOR SELECT TO authenticated USING (rider_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Wishlist
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drink_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, drink_slug)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist own" ON public.wishlist FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drink_slug text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  author_name text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, drink_slug)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon USING (hidden = false);
CREATE POLICY "reviews auth read" ON public.reviews FOR SELECT TO authenticated USING (hidden = false OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Public read of active orders for /order/$id status page (already exists via unauth insert; ensure anon can select by id)
-- If a policy already grants anon select, this is idempotent-friendly:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='anon read by id') THEN
    CREATE POLICY "anon read by id" ON public.orders FOR SELECT TO anon USING (true);
  END IF;
END $$;
GRANT SELECT ON public.orders TO anon;

-- Realtime for rider locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
