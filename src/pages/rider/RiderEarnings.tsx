// /rider/earnings — commission payouts ledger.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { getMyEarnings } from "@/lib/rider.functions";
import { RiderShell, RiderStat } from "@/components/site/RiderShell";

type Resp = Awaited<ReturnType<typeof getMyEarnings>>;

export default function RiderEarnings() {
  const fn = useServerFn(getMyEarnings);
  const [d, setD] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    try { setD(await fn()); }
    catch (e) { console.warn(e); }
  }, [fn]);

  useEffect(() => { void load(); }, [load]);

  return (
    <RiderShell title="Earnings" subtitle="Your rider commission">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <RiderStat label="Total earned" value={`Le ${(d?.total ?? 0).toLocaleString()}`} />
        <RiderStat label="Paid out" value={`Le ${(d?.paid ?? 0).toLocaleString()}`} />
        <RiderStat label="Owed" value={`Le ${(d?.owed ?? 0).toLocaleString()}`} />
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Order</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody>
            {(d?.payouts ?? []).map((p) => (
              <tr key={p.id} className="border-t align-top">
                <td className="p-3"><Link to="/rider/deliveries" className="font-mono text-xs text-[hsl(var(--sea))] hover:underline">{p.order_id.slice(0, 8)}</Link></td>
                <td className="p-3 text-right tabular-nums">Le {p.amount_leones.toLocaleString()}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "paid" ? "bg-[hsl(var(--leaf))]/20 text-[hsl(var(--leaf))]" : "bg-orange-100 text-orange-700"}`}>{p.status}</span></td>
                <td className="p-3 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!d?.payouts.length && (
              <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">No payouts yet — complete a delivery to earn commission.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </RiderShell>
  );
}
