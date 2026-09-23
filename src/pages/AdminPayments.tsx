import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, useAdminPass, handleAdminError, leones } from "./AdminShell";
import { listPaymentsLedger } from "@/lib/admin.functions";
import { paymentLabel } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Ledger = Awaited<ReturnType<typeof listPaymentsLedger>>;
const FILTERS = ["all", "paid", "awaiting_payment", "delivered", "payment_failed", "cod_pending"];

export default function AdminPayments() {
  const pass = useAdminPass();
  const navigate = useNavigate();
  const list = useServerFn(listPaymentsLedger);
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState<Ledger | null>(null);

  const load = useCallback(async () => {
    if (!pass) return;
    try { setData(await list({ data: { passcode: pass, status: filter } })); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
  }, [pass, filter, list, navigate]);
  useEffect(() => { void load(); }, [load]);

  const t = data?.totals;
  return (
    <AdminShell title="Payments ledger">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ["Collected", leones(t?.collected)],
          ["Paid orders", String(t?.paid_count ?? 0)],
          ["Awaiting payment", String(t?.pending_count ?? 0)],
          ["Rider payouts due", leones(t?.payouts_pending)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f.replace(/_/g, " ")}</Button>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr>
            <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Reference</th><th className="p-3">Date</th>
          </tr></thead>
          <tbody>
            {(data?.rows ?? []).map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3"><Link to={`/order/${o.id}`} className="underline font-mono">#{o.id.slice(0, 8).toUpperCase()}</Link></td>
                <td className="p-3">{o.customer_name}<div className="text-xs text-muted-foreground">{o.phone}</div></td>
                <td className="p-3">{paymentLabel(o.payment_method)}</td>
                <td className="p-3 font-medium">{leones(o.total_leones)}</td>
                <td className="p-3"><Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge></td>
                <td className="p-3 text-xs font-mono">{o.monime_transaction_id || o.manual_transfer_ref || o.monime_ussd_code || "—"}</td>
                <td className="p-3 text-xs">{new Date(o.paid_at ?? o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="font-semibold mb-2">Rider payouts</h2>
      <div className="rounded-xl border bg-card divide-y mb-8">
        {(data?.payouts ?? []).map((p) => (
          <div key={p.id} className="p-3 flex flex-wrap gap-4 text-sm">
            <span className="font-mono">#{String(p.order_id).slice(0, 8).toUpperCase()}</span>
            <span>{leones(p.amount_leones)}</span><Badge variant="outline">{p.status}</Badge>
            <span className="text-muted-foreground ml-auto">{new Date(p.created_at).toLocaleString()}</span>
          </div>
        ))}
        {(data?.payouts ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">No payouts yet.</p>}
      </div>
      <h2 className="font-semibold mb-2">Monime callbacks</h2>
      <div className="rounded-xl border bg-card divide-y">
        {(data?.hooks ?? []).map((h) => (
          <div key={h.id} className="p-3 flex flex-wrap gap-4 text-sm">
            <span>{h.event_type}</span>
            <Badge variant={h.verified ? "default" : "destructive"}>{h.verified ? "verified" : "unverified"}</Badge>
            {h.applied && <Badge variant="outline">applied</Badge>}
            {h.error && <span className="text-destructive text-xs">{h.error}</span>}
            <span className="text-muted-foreground ml-auto">{new Date(h.created_at).toLocaleString()}</span>
          </div>
        ))}
        {(data?.hooks ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">No callbacks received yet.</p>}
      </div>
    </AdminShell>
  );
}
