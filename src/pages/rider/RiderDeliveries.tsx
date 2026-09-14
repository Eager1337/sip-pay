// /rider/deliveries — the rider's accepted orders: start delivery + complete.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyDeliveries, markOutForDelivery, completeDelivery } from "@/lib/delivery.functions";
import { RiderShell } from "@/components/site/RiderShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, CheckCircle2, PlayCircle } from "lucide-react";

type Order = {
  id: string; customer_name: string; phone: string; address: string; status: string;
  total_leones: number; created_at: string; delivery_code: string | null;
  rider_commission_leones: number | null;
  items: Array<{ name: string; qty: number }>;
};

export default function RiderDeliveries() {
  const mineFn = useServerFn(listMyDeliveries);
  const outFn = useServerFn(markOutForDelivery);
  const completeFn = useServerFn(completeDelivery);
  const [rows, setRows] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setRows((await mineFn()) as unknown as Order[]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }, [mineFn]);

  useEffect(() => { void load(); }, [load]);

  const goOut = async (id: string) => {
    setBusy(id);
    try { await outFn({ data: { order_id: id } }); toast.success("Out for delivery."); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };
  const complete = async (id: string) => {
    const code = codes[id] ?? "";
    if (code.length < 4) { toast.error("Enter the 6-digit code from the customer."); return; }
    setBusy(id);
    try { await completeFn({ data: { order_id: id, delivery_code: code } }); toast.success("Delivery complete!"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  return (
    <RiderShell title="My deliveries" subtitle="Start, track and complete your orders" actions={
      <Button variant="outline" size="sm" onClick={() => void load()}>Refresh</Button>
    }>
      <div className="grid gap-3">
        {rows.length === 0 && (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
            You haven't accepted any orders yet.
          </div>
        )}
        {rows.map((o) => {
          const isOut = o.status === "out_for_delivery";
          const isDelivered = o.status === "delivered";
          return (
            <div key={o.id} className="rounded-xl border bg-white p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{o.id.slice(0, 8)}</span>
                <span className="uppercase tracking-wider">{o.status.replace(/_/g, " ")}</span>
              </div>
              <div className="font-semibold">{o.customer_name} · <span className="text-muted-foreground font-normal">{o.phone}</span></div>
              <div className="text-sm flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{o.address}</div>
              <div className="text-xs text-muted-foreground">{o.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</div>
              <div className="text-xs">Commission: <span className="font-semibold text-[hsl(var(--sea))]">Le {(o.rider_commission_leones ?? 0).toLocaleString()}</span></div>
              {!isDelivered && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {!isOut && (
                    <Button size="sm" disabled={busy === o.id} onClick={() => void goOut(o.id)}>
                      <PlayCircle className="h-4 w-4 mr-1" /> Start delivery
                    </Button>
                  )}
                  {isOut && (
                    <div className="flex gap-2 items-center">
                      <Input value={codes[o.id] ?? ""} onChange={(e) => setCodes((c) => ({ ...c, [o.id]: e.target.value }))}
                             placeholder="Customer code" className="w-40" maxLength={6} />
                      <Button size="sm" disabled={busy === o.id} onClick={() => void complete(o.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </RiderShell>
  );
}
