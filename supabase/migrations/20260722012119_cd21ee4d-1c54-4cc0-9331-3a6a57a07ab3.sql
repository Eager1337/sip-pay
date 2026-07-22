ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS delivery_fee_leones integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_leones integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monime_order_number text,
  ADD COLUMN IF NOT EXISTS monime_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_failure_reason text;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_created_at ON public.orders (lower(customer_email), created_at DESC) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_monime_session_id ON public.orders (monime_session_id) WHERE monime_session_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can read an order by id" ON public.orders;
DROP POLICY IF EXISTS "anon read by id" ON public.orders;

CREATE POLICY "Buyers can read orders for their email"
ON public.orders
FOR SELECT
TO authenticated
USING (customer_email IS NOT NULL AND lower(customer_email) = lower((auth.jwt() ->> 'email')));

GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;