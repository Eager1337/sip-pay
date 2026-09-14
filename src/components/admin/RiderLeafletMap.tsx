// Client-only Leaflet map for active rider positions. Imported lazily by
// AdminRiderMap so leaflet (which needs `window`) never runs during SSR.
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RiderPoint = { lat: number; lng: number; label: string; sub?: string };

// Colored dot marker — avoids the bundled leaflet marker-image assets entirely.
const dotIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:hsl(var(--sea));border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points }: { points: RiderPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.2));
    }
  }, [points, map]);
  return null;
}

export default function RiderLeafletMap({ points }: { points: RiderPoint[] }) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [-8.4657, -13.2317];
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false}
      style={{ height: 360, width: "100%", borderRadius: 12, zIndex: 0 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={dotIcon}>
          <Popup>
            <strong>{p.label}</strong>
            {p.sub ? <><br />{p.sub}</> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
