-- ================= PROFILES =================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles own read" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager','support')));
CREATE POLICY "profiles own insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE UNIQUE INDEX profiles_phone_key ON public.profiles (phone) WHERE phone IS NOT NULL;
CREATE INDEX profiles_email_idx ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone)
  VALUES (NEW.id,
          NEW.raw_user_meta_data ->> 'first_name',
          NEW.raw_user_meta_data ->> 'last_name',
          NEW.email,
          NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user();

-- ================= ADDRESSES =================
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  recipient_name text,
  phone text,
  area text,
  address text NOT NULL,
  landmark text,
  instructions text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses own" ON public.addresses FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX addresses_user_idx ON public.addresses (user_id);
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ================= RIDER APPROVAL =================
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS vehicle_registration text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.riders ADD CONSTRAINT riders_status_chk
  CHECK (status IN ('pending','approved','rejected','suspended','inactive'));
CREATE UNIQUE INDEX IF NOT EXISTS riders_user_id_key ON public.riders (user_id);
CREATE INDEX IF NOT EXISTS riders_status_idx ON public.riders (status);

-- riders may edit their own profile fields but never their approval status
DROP POLICY IF EXISTS "riders update own" ON public.riders;
CREATE POLICY "riders admin update" ON public.riders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager','dispatcher')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager','dispatcher')));
CREATE POLICY "riders self update online only" ON public.riders FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND status = (SELECT r2.status FROM public.riders r2 WHERE r2.id = riders.id));

DROP POLICY IF EXISTS "riders read own" ON public.riders;
CREATE POLICY "riders read own" ON public.riders FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager','dispatcher','support')));

-- ================= DELIVERY ZONES =================
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  areas text[] NOT NULL DEFAULT '{}',
  fee_leones integer NOT NULL DEFAULT 0,
  eta_min_minutes integer NOT NULL DEFAULT 30,
  eta_max_minutes integer NOT NULL DEFAULT 60,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones public read" ON public.delivery_zones FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "zones admin read" ON public.delivery_zones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager')));
CREATE POLICY "zones admin write" ON public.delivery_zones FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','manager')));
CREATE TRIGGER delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.delivery_zones (name, areas, fee_leones, eta_min_minutes, eta_max_minutes, sort_order) VALUES
('Zone 1 — Central Freetown', ARRAY['Central','Tower Hill','Brookfields','Congo Cross','Murray Town','Aberdeen','Lumley','Wilberforce'], 15, 30, 60, 1),
('Zone 2 — Western Freetown', ARRAY['Goderich','Hamilton','Adonkia','Juba','Regent','Hill Station','Spur Road','Kissy Town Road'], 25, 45, 90, 2),
('Zone 3 — Eastern Freetown', ARRAY['Kissy','Wellington','Calaba Town','Allen Town','Waterloo','Grafton','Jui','Kossoh Town'], 35, 60, 120, 3);

-- ================= PAYMENTS =================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL,
  payment_method text NOT NULL,
  amount_leones integer NOT NULL,
  currency text NOT NULL DEFAULT 'SLE',
  status text NOT NULL DEFAULT 'pending',
  provider_transaction_id text,
  provider_reference text,
  checkout_reference text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_status_chk CHECK (status IN
    ('pending','processing','requires_action','paid','failed','cancelled','refunded','partially_refunded','pending_cash_collection'))
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own read" ON public.payments FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.buyer_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','finance','manager'))
);
CREATE UNIQUE INDEX payments_provider_txn_key ON public.payments (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX payments_checkout_reference_key ON public.payments (checkout_reference)
  WHERE checkout_reference IS NOT NULL;
CREATE INDEX payments_order_idx ON public.payments (order_id);
CREATE INDEX payments_customer_idx ON public.payments (customer_id);
CREATE INDEX payments_status_idx ON public.payments (status);
CREATE INDEX payments_created_idx ON public.payments (created_at DESC);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text,
  signature_verified boolean NOT NULL DEFAULT false,
  applied boolean NOT NULL DEFAULT false,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment events staff read" ON public.payment_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','finance')));
CREATE UNIQUE INDEX payment_events_provider_event_key ON public.payment_events (provider, provider_event_id);
CREATE INDEX payment_events_order_idx ON public.payment_events (order_id);

-- ================= NOTIFICATIONS =================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications own delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX notifications_user_idx ON public.notifications (user_id, read, created_at DESC);

-- ================= AUDIT LOG =================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit staff read" ON public.audit_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity, entity_id);

-- ================= ORDER INDEXES =================
CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders (phone);
CREATE INDEX IF NOT EXISTS orders_email_idx ON public.orders (lower(customer_email));
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_rider_idx ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON public.orders (buyer_user_id);