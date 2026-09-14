// Admin live-rider map card. Polls active rider positions every 15s and renders
// them on a Leaflet map (loaded lazily / client-only).
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Bike, Loader2, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getActiveRiderLocations } from "@/lib/admin-extras.functions";
import { useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";

const RiderLeafletMap = lazy(() => import("./RiderLeafletMap"));

type Rider = {
  order_id: string; rider_id: string; display_name: string;
  customer_name: string | null; delivery_code: string | null;
  lat: number; lng: number; updated_at: string;
};

export default function AdminRiderMap() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(getActiveRiderLocations);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true);
    try { setRiders((await fn({ data: { passcode } })).riders as Rider[]); }
    catch (e) { onError(e); } finally { setLoading(false); }
  }, [fn, passcode, onError]);

  useEffect(() => {
    setMounted(true);
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const points = riders.map((r) => ({
    lat: r.lat, lng: r.lng, label: r.display_name,
    sub: r.customer_name ? `Delivering to ${r.customer_name}` : "On delivery",
  }));

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="display text-lg flex items-center gap-2">
          <Bike className="h-4 w-4 text-[hsl(var(--sea))]" /> Live rider locations
        </h3>
        <button onClick={() => void load()} disabled={loading}
          className="text-xs rounded-md border px-3 py-1.5 hover:bg-muted disabled:opacity-50">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {riders.length} rider(s) on an active delivery · auto-refresh every 15s
      </p>

      {mounted && riders.length > 0 ? (
        <Suspense fallback={
          <div className="h-[360px] grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading map…
          </div>
        }>
          <RiderLeafletMap points={points} />
        </Suspense>
      ) : (
        <div className="h-[360px] grid place-items-center border rounded-xl bg-muted/30 text-center">
          <div>
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No riders on an active delivery right now.</p>
            <p className="text-xs text-muted-foreground">Locations appear here when a rider is out for delivery.</p>
          </div>
        </div>
      )}
    </div>
  );
}
