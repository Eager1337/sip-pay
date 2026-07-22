ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_checkout_id text,
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_checkout_id_unique
ON public.orders (client_checkout_id)
WHERE client_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id_created_at
ON public.orders (buyer_user_id, created_at DESC)
WHERE buyer_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Buyers can read own linked orders" ON public.orders;
CREATE POLICY "Buyers can read own linked orders"
ON public.orders
FOR SELECT
TO authenticated
USING (buyer_user_id = auth.uid());