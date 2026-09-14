// /admin/payouts — rider commission ledger, mark payouts as paid.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { listPayoutsAdmin, markPayoutPaid } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, StatCard, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Resp = Awaited<ReturnType<typeof listPayoutsAdmin>>;

export default function AdminPayouts() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const listFn = useServerFn(listPayoutsAdmin);
  const paidFn = useServerFn(markPayoutPaid);
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await listFn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [listFn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const markPaid = async (id: string) => {
    setBusy(id);
    try { await paidFn({ data: { passcode, payout_id: id } }); await load(); }
    catch (e) { onError(e); } finally { setBusy(null); }
  };

  if (!passcode) return null;
  const payouts = data?.payouts ?? [];
  const owed = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount_leones, 0);

  return (
    <AdminShell title="Payouts" subtitle="Rider commission ledger">
      <Helmet><title>Payouts — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total payouts" value={payouts.length} />
        <StatCard label="Unpaid" value={payouts.filter((p) => p.status !== "paid").length} />
        <StatCard label="Amount owed" value={`Le ${owed.toLocaleString()}`} />
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Rider</th><th className="p-3">Order</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Action</th></tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t align-top">
                <td className="p-3"><div className="font-medium">{p.rider_name}</div><div className="text-xs text-muted-foreground font-mono">{p.rider_phone}</div></td>
                <td className="p-3"><Link to="/admin/orders" className="font-mono text-xs text-[hsl(var(--sea))] hover:underline">{p.order_id.slice(0, 8)}</Link></td>
                <td className="p-3 text-right tabular-nums">Le {p.amount_leones.toLocaleString()}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "paid" ? "bg-[hsl(var(--leaf))]/20 text-[hsl(var(--leaf))]" : "bg-orange-100 text-orange-700"}`}>{p.status}</span></td>
                <td className="p-3 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {p.status !== "paid" && (
                    <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => void markPaid(p.id)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!payouts.length && <EmptyRow colSpan={6}>No payouts recorded yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
