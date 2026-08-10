-- 1. Stop realtime broadcast of rider GPS
ALTER PUBLICATION supabase_realtime DROP TABLE public.rider_locations;

-- 2. Rewrite every policy that used has_role() with an inline self-scoped role check
DROP POLICY IF EXISTS "Admins read analytics" ON public.analytics_events;
CREATE POLICY "Admins read analytics" ON public.analytics_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Admins insert order events" ON public.order_events;
DROP POLICY IF EXISTS "Admins read order events" ON public.order_events;
DROP POLICY IF EXISTS "Admins read order_events" ON public.order_events;
DROP POLICY IF EXISTS "Admins write order_events" ON public.order_events;
CREATE POLICY "Admins read order events" ON public.order_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins insert order events" ON public.order_events FOR INSERT TO authenticated
WITH CHECK (actor = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "reviews auth read" ON public.reviews;
DROP POLICY IF EXISTS "reviews own delete" ON public.reviews;
DROP POLICY IF EXISTS "reviews own update" ON public.reviews;
CREATE POLICY "reviews auth read" ON public.reviews FOR SELECT TO authenticated
USING (hidden = false OR user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "payouts read own or admin" ON public.rider_payouts;
CREATE POLICY "payouts read own or admin" ON public.rider_payouts FOR SELECT TO authenticated
USING (rider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "riders read own" ON public.riders;
DROP POLICY IF EXISTS "riders update own" ON public.riders;
CREATE POLICY "riders read own" ON public.riders FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "riders update own" ON public.riders FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Admins read webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Admins read webhook_events" ON public.webhook_events;
CREATE POLICY "Admins read webhook events" ON public.webhook_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "Admins read wholesale leads" ON public.wholesale_leads;
CREATE POLICY "Admins read wholesale leads" ON public.wholesale_leads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- roles table: only own rows readable from the client (admin listing goes through server-side code)
DROP POLICY IF EXISTS "Admins read all user_roles" ON public.user_roles;

-- 3. Rider locations: no anonymous access, strictly scoped reads
DROP POLICY IF EXISTS "loc public read by order" ON public.rider_locations;
DROP POLICY IF EXISTS "loc auth read by order" ON public.rider_locations;
DROP POLICY IF EXISTS "loc rider insert" ON public.rider_locations;

REVOKE ALL ON public.rider_locations FROM anon;
GRANT SELECT, INSERT ON public.rider_locations TO authenticated;
GRANT ALL ON public.rider_locations TO service_role;

CREATE POLICY "loc rider reads own" ON public.rider_locations FOR SELECT TO authenticated
USING (rider_id = auth.uid());

CREATE POLICY "loc buyer reads active order rider" ON public.rider_locations FOR SELECT TO authenticated
USING (
  order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = rider_locations.order_id
      AND o.rider_id = rider_locations.rider_id
      AND (o.buyer_user_id = auth.uid()
           OR (o.customer_email IS NOT NULL AND lower(o.customer_email) = lower(auth.jwt() ->> 'email')))
      AND o.status IN ('paid','assigned','picked_up','out_for_delivery')
  )
);

CREATE POLICY "loc admin reads all" ON public.rider_locations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "loc rider insert own active" ON public.rider_locations FOR INSERT TO authenticated
WITH CHECK (
  rider_id = auth.uid()
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.rider_id = auth.uid()
      AND o.status IN ('paid','assigned','picked_up','out_for_delivery')
  )
);

-- 4. Remove the SECURITY DEFINER helper that signed-in users could execute
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);