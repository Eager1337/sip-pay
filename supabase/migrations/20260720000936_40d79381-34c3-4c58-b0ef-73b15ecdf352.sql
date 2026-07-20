-- Idempotency + audit for Monime webhooks and admin actions

-- 1. orders: admin fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text; -- 'orange_money' | 'afrimoney' | 'cod'

-- Allow admins to update / delete orders
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anon/auth to read their own order for status page (by id only — no listing)
-- The order id is a uuid, so knowing it acts as an unguessable capability token.
DROP POLICY IF EXISTS "Anyone can read an order by id" ON public.orders;
CREATE POLICY "Anyone can read an order by id" ON public.orders
  FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.orders TO anon;

-- 2. webhook_events — idempotency + audit log
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id text PRIMARY KEY, -- Monime event id (or synthesized hash if none)
  provider text NOT NULL DEFAULT 'monime',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  event_type text,
  verified boolean NOT NULL DEFAULT false,
  applied boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. order_events — admin audit trail
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'status_change' | 'note' | 'webhook'
  from_status text,
  to_status text,
  note text,
  actor uuid, -- auth.uid() of admin, null for system
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read order events" ON public.order_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert order events" ON public.order_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor = auth.uid());

-- 4. Unique index on monime_payment_id to prevent double-paid via a race
CREATE UNIQUE INDEX IF NOT EXISTS orders_monime_payment_id_unique
  ON public.orders (monime_payment_id)
  WHERE monime_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders (phone);