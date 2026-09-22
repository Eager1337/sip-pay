-- Riders are identified by public.riders.id everywhere in the app; repoint FKs.
UPDATE public.orders SET rider_id = NULL WHERE rider_id IS NOT NULL AND rider_id NOT IN (SELECT id FROM public.riders);
DELETE FROM public.rider_locations WHERE rider_id NOT IN (SELECT id FROM public.riders);
DELETE FROM public.rider_payouts WHERE rider_id NOT IN (SELECT id FROM public.riders);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_rider_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE SET NULL;

ALTER TABLE public.rider_locations DROP CONSTRAINT IF EXISTS rider_locations_rider_id_fkey;
ALTER TABLE public.rider_locations ADD CONSTRAINT rider_locations_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE;

ALTER TABLE public.rider_payouts DROP CONSTRAINT IF EXISTS rider_payouts_rider_id_fkey;
ALTER TABLE public.rider_payouts ADD CONSTRAINT rider_payouts_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE;

-- One live position per order so updates overwrite instead of piling up.
DELETE FROM public.rider_locations a USING public.rider_locations b
  WHERE a.order_id = b.order_id AND a.updated_at < b.updated_at;
ALTER TABLE public.rider_locations ADD CONSTRAINT rider_locations_order_id_key UNIQUE (order_id);

-- Policies: map auth.uid() to the rider row.
DROP POLICY IF EXISTS "loc rider reads own" ON public.rider_locations;
CREATE POLICY "loc rider reads own" ON public.rider_locations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_locations.rider_id AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "loc rider insert own active" ON public.rider_locations;
CREATE POLICY "loc rider insert own active" ON public.rider_locations FOR INSERT TO authenticated
  WITH CHECK (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o JOIN public.riders r ON r.id = o.rider_id
      WHERE o.id = rider_locations.order_id
        AND r.id = rider_locations.rider_id
        AND r.user_id = auth.uid()
        AND o.status = ANY (ARRAY['paid','assigned','picked_up','out_for_delivery'])
    )
  );

DROP POLICY IF EXISTS "payouts read own or admin" ON public.rider_payouts;
CREATE POLICY "payouts read own or admin" ON public.rider_payouts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_payouts.rider_id AND r.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
  );