
-- Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_monime_payment_id_key
  ON public.orders (monime_payment_id)
  WHERE monime_payment_id IS NOT NULL;

-- Public can read a single order by its uuid (needed for order status page).
DROP POLICY IF EXISTS "Anyone can read an order by id" ON public.orders;
CREATE POLICY "Anyone can read an order by id"
  ON public.orders FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.orders TO anon;

-- Webhook event log for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  order_id UUID,
  event_type TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  applied BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhook_events TO service_role;
GRANT SELECT ON public.webhook_events TO authenticated;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook_events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Order events audit trail
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  actor UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON public.order_events (order_id, created_at DESC);
GRANT ALL ON public.order_events TO service_role;
GRANT SELECT, INSERT ON public.order_events TO authenticated;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read order_events"
  ON public.order_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write order_events"
  ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
