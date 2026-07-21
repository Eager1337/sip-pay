// /delivery — rider portal. Riders sign in with Supabase auth, register
// once, then see pending orders and their own deliveries.
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  registerRider, getMyRider, listAvailableOrders, listMyDeliveries,
  acceptOrder, markOutForDelivery, completeDelivery, postRiderLocation,
} from "@/lib/delivery.functions";
import { toast } from "sonner";
import { Bike, MapPin, Package, CheckCircle2, PlayCircle } from "lucide-react";

type Order = {
  id: string; customer_name: string; phone: string; address: string;
  total_leones: number; status: string; created_at: string;
  delivery_code?: string | null; out_for_delivery_at?: string | null;
  delivered_at?: string | null; customer_confirmed_at?: string | null;
  rider_commission_leones?: number | null;
  items: Array<{ slug: string; name: string; qty: number; price: number }>;
};

type Rider = { id: string; display_name: string; phone: string; vehicle: string | null; active: boolean };

export default function DeliveryPortal() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const registerFn = useServerFn(registerRider);
  const getRiderFn = useServerFn(getMyRider);
  const availFn = useServerFn(listAvailableOrders);
  const mineFn = useServerFn(listMyDeliveries);
  const acceptFn = useServerFn(acceptOrder);
  const outFn = useServerFn(markOutForDelivery);
  const completeFn = useServerFn(completeDelivery);
  const locFn = useServerFn(postRiderLocation);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await getRiderFn();
      setRider(r as Rider | null);
      if (r) {
        const [a, m] = await Promise.all([availFn(), mineFn()]);
        setAvailable(a as Order[]);
        setMine(m as Order[]);
      }
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [userId, getRiderFn, availFn, mineFn]);

  useEffect(() => { void load(); }, [load]);

  // Broadcast GPS for orders currently out for delivery.
  useEffect(() => {
    if (!rider) return;
    const active = mine.filter((o) => o.status === "out_for_delivery");
    if (active.length === 0) return;
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          active.forEach((o) => {
            void locFn({ data: { order_id: o.id, lat: pos.coords.latitude, lng: pos.coords.longitude } });
          });
        },
        (err) => console.warn("geo err", err),
        { enableHighAccuracy: true, maximumAge: 15000 },
      );
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [rider, mine, locFn]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const mode = String(fd.get("mode"));
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/delivery` },
      });
      if (error) return toast.error(error.message);
      toast.success("Account created. Check email if confirmation is required.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error(error.message);
    }
  };

  const register = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await registerFn({ data: {
        display_name: String(fd.get("display_name")),
        phone: String(fd.get("phone")),
        vehicle: String(fd.get("vehicle") ?? ""),
      } });
      toast.success("Rider profile created.");
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const accept = async (id: string) => {
    try { await acceptFn({ data: { order_id: id } }); toast.success("Order accepted."); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const goOut = async (id: string) => {
    try { await outFn({ data: { order_id: id } }); toast.success("Out for delivery — GPS sharing on."); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const complete = async (id: string, code: string) => {
    try { await completeFn({ data: { order_id: id, delivery_code: code } }); toast.success("Delivery complete."); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <Layout>
      <Helmet><title>Delivery Rider — KK Drinks</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--sea))] text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="display text-4xl">Delivery portal</h1>
              <p className="text-sm text-muted-foreground">Earn 15% commission on every delivery you complete.</p>
            </div>
          </div>

          {!userId ? (
            <form onSubmit={signIn} className="rounded-xl border bg-white p-6 space-y-3 max-w-md">
              <h2 className="display text-xl">Rider sign in</h2>
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password (min 6)" minLength={6} required />
              <div className="flex gap-2">
                <Button type="submit" name="mode" value="signin">Sign in</Button>
                <Button type="submit" name="mode" value="signup" variant="outline">Create rider account</Button>
              </div>
            </form>
          ) : !rider ? (
            <form onSubmit={register} className="rounded-xl border bg-white p-6 space-y-3 max-w-md">
              <h2 className="display text-xl">Register as a rider</h2>
              <Input name="display_name" placeholder="Full name" required minLength={2} />
              <Input name="phone" placeholder="Phone (WhatsApp)" required minLength={6} />
              <Input name="vehicle" placeholder="Vehicle (e.g. Motorbike, Bicycle)" />
              <Button type="submit">Register</Button>
            </form>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
                <div className="text-sm">
                  Signed in as <span className="font-semibold">{rider.display_name}</span>
                  <span className="text-muted-foreground"> · {rider.phone}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Sign out</Button>
              </div>

              {/* Available orders */}
              <div>
                <h2 className="display text-2xl mb-3">Available orders {loading && "…"}</h2>
                <div className="grid gap-3">
                  {available.length === 0 && (
                    <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                      No pending orders right now.
                    </div>
                  )}
                  {available.map((o) => (
                    <div key={o.id} className="rounded-xl border bg-white p-4 flex flex-wrap justify-between gap-3">
                      <div className="flex-1 min-w-[220px] space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" /> {o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}
                        </div>
                        <div className="font-semibold">{o.customer_name} · <span className="text-muted-foreground font-normal">{o.phone}</span></div>
                        <div className="text-sm flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{o.address}</div>
                        <div className="text-xs text-muted-foreground">{o.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="tabular-nums font-semibold">Le {o.total_leones}</div>
                        <div className="text-[10px] text-[hsl(var(--sea))]">Earn Le {o.rider_commission_leones ?? Math.round(o.total_leones * 0.15)}</div>
                        <Button size="sm" onClick={() => accept(o.id)}>Accept</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My deliveries */}
              <div>
                <h2 className="display text-2xl mb-3">My deliveries</h2>
                <div className="grid gap-3">
                  {mine.length === 0 && (
                    <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                      You haven't accepted any orders yet.
                    </div>
                  )}
                  {mine.map((o) => (
                    <MyDeliveryCard key={o.id} order={o} onOut={() => goOut(o.id)} onComplete={(code) => complete(o.id, code)} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MyDeliveryCard({ order, onOut, onComplete }: {
  order: Order; onOut: () => void; onComplete: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const isOut = order.status === "out_for_delivery";
  const isDelivered = order.status === "delivered";
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{order.id.slice(0, 8)}</span>
        <span className="uppercase tracking-wider">{order.status.replace(/_/g, " ")}</span>
      </div>
      <div className="font-semibold">{order.customer_name} · <span className="text-muted-foreground font-normal">{order.phone}</span></div>
      <div className="text-sm flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{order.address}</div>
      <div className="text-xs text-muted-foreground">{order.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</div>
      <div className="text-xs">Commission: <span className="font-semibold text-[hsl(var(--sea))]">Le {order.rider_commission_leones ?? 0}</span></div>
      {!isDelivered && (
        <div className="flex flex-wrap gap-2 pt-2">
          {!isOut && (
            <Button size="sm" onClick={onOut}><PlayCircle className="h-4 w-4 mr-1" /> Start delivery</Button>
          )}
          {isOut && (
            <div className="flex gap-2 items-center">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit code" className="w-40" maxLength={6} />
              <Button size="sm" onClick={() => onComplete(code)} disabled={code.length < 4}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
