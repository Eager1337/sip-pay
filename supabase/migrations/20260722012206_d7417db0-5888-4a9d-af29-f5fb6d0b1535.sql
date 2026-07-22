ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS monime_checkout_url text;