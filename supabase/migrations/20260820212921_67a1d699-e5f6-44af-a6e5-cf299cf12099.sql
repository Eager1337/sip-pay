ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS monime_payment_code_id text,
  ADD COLUMN IF NOT EXISTS monime_ussd_code text,
  ADD COLUMN IF NOT EXISTS payment_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_transfer_ref text,
  ADD COLUMN IF NOT EXISTS manual_transfer_number text,
  ADD COLUMN IF NOT EXISTS manual_transfer_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_payment_code_idx ON public.orders (monime_payment_code_id);
