// /rider/queue — available orders the rider can accept.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAvailableOrders, acceptOrder } from "@/lib/delivery.functions";
import { RiderShell } from "@/components/site/RiderShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Package } from "lucide-react";

type Order = {
  id: string; customer_name: string; phone: string; address: string;
  total_leones: number; created_at: string; rider_commission_leones: number | null;
  items: Array<{ name: string; qty: number }>;
};

export default function RiderQueue() {
  const availFn = useServerFn(listAvailableOrders);
  const acceptFn = useServerFn(acceptOrder);
  const [rows, setRows] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows((await availFn()) as unknown as Order[]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }, [availFn]);

  useEffect(() => { void load(); }, [load]);

  const accept = async (id: string) => {
    setBusy(id);
    try { await acceptFn({ data: { order_id: id } }); toast.success("Order accepted."); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  return (
    <RiderShell title="Available orders" subtitle="Accept an order to start delivery" actions={
      <Button variant="outline" size="sm" onClick={() => void load()}>Refresh</Button>
    }>
      <div className="grid gap-3">
        {rows.length === 0 && (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
            No pending orders right now. Check back soon.
          </div>
        )}
        {rows.map((o) => (
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
              <div className="tabular-nums font-semibold">Le {o.total_leones.toLocaleString()}</div>
              <div className="text-[10px] text-[hsl(var(--sea))]">Earn Le {(o.rider_commission_leones ?? Math.round(o.total_leones * 0.15)).toLocaleString()}</div>
              <Button size="sm" disabled={busy === o.id} onClick={() => void accept(o.id)}>Accept</Button>
            </div>
          </div>
        ))}
      </div>
    </RiderShell>
  );
}
