
-- Lock down has_role so anon cannot call it
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Fix tg_set_updated_at search_path
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Tighten insert policies: enforce non-empty key fields
DROP POLICY "Anyone can place an order" ON public.orders;
CREATE POLICY "Anyone can place an order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(customer_name) > 0 AND length(phone) > 0 AND length(address) > 0);

DROP POLICY "Anyone can submit a wholesale lead" ON public.wholesale_leads;
CREATE POLICY "Anyone can submit a wholesale lead" ON public.wholesale_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(full_name) > 0 AND length(email) > 0 AND length(phone) > 0);

DROP POLICY "Anyone can log an event" ON public.analytics_events;
CREATE POLICY "Anyone can log an event" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(event_type) > 0);
