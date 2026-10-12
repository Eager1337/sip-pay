// Interactive live map for the rider portal. Loads the Maps JavaScript API
// asynchronously and shows the rider's live GPS position with an accuracy
// ring, a breadcrumb trail, and a recenter control.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, Navigation } from "lucide-react";

declare global {
  interface Window {
    __kkInitMap?: () => void;
    google?: any;
  }
}

const FREETOWN = { lat: 8.4657, lng: -13.2317 };

let mapsPromise: Promise<any> | null = null;

function loadMaps(): Promise<any> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps);
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    if (!key) return reject(new Error("Google Maps browser key is not configured"));
    window.__kkInitMap = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__kkInitMap&channel=${channel ?? ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function RiderMap({
  position,
  sharing,
  deliveries,
}: {
  position: { lat: number; lng: number; accuracy?: number } | null;
  sharing: boolean;
  deliveries: Array<{ id: string; customer_name: string; address: string; status: string }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const trailRef = useRef<any>(null);
  const trailPoints = useRef<Array<{ lat: number; lng: number }>>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        mapRef.current = new maps.Map(ref.current, {
          center: position ?? FREETOWN,
          zoom: position ? 16 : 12,
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        setReady(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Map failed to load"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !position || !mapRef.current) return;
    const maps = window.google.maps;
    const ll = { lat: position.lat, lng: position.lng };
    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        map: mapRef.current,
        position: ll,
        title: "You",
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#0ea5e9",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      circleRef.current = new maps.Circle({
        map: mapRef.current,
        center: ll,
        radius: position.accuracy ?? 30,
        fillColor: "#0ea5e9",
        fillOpacity: 0.12,
        strokeColor: "#0ea5e9",
        strokeOpacity: 0.3,
        strokeWeight: 1,
      });
      trailRef.current = new maps.Polyline({
        map: mapRef.current,
        path: [],
        strokeColor: "#0ea5e9",
        strokeOpacity: 0.6,
        strokeWeight: 3,
      });
      mapRef.current.panTo(ll);
    } else {
      markerRef.current.setPosition(ll);
      circleRef.current.setCenter(ll);
      circleRef.current.setRadius(position.accuracy ?? 30);
    }
    const last = trailPoints.current[trailPoints.current.length - 1];
    if (!last || Math.abs(last.lat - ll.lat) > 0.00005 || Math.abs(last.lng - ll.lng) > 0.00005) {
      trailPoints.current.push(ll);
      if (trailPoints.current.length > 200) trailPoints.current.shift();
      trailRef.current?.setPath(trailPoints.current);
    }
  }, [ready, position]);

  const recenter = () => {
    if (mapRef.current && position) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }
  };

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Navigation className="h-4 w-4 text-[hsl(var(--sea))]" /> Live map
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              sharing && position
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sharing && position ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            {sharing && position ? "Sharing live" : "Not sharing"}
          </span>
          <Button size="sm" variant="ghost" onClick={recenter} disabled={!position}>
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative">
        <div ref={ref} className="h-80 w-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 text-sm text-muted-foreground px-6 text-center">
            {error}
          </div>
        )}
        {!position && !error && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-muted-foreground shadow">
              Waiting for your phone's GPS… tap "Start delivery" on an order to share your location.
            </span>
          </div>
        )}
      </div>
      {deliveries.length > 0 && (
        <div className="divide-y text-sm">
          {deliveries.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="font-medium truncate">{d.customer_name}</div>
                <div className="text-xs text-muted-foreground truncate">{d.address}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.status === "out_for_delivery" && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium">Out for delivery</span>
                )}
                <a
                  className="text-xs text-[hsl(var(--sea))] underline"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
