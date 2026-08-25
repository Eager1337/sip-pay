// /admin/riders — list riders, toggle active, see deliveries + owed commission.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listRidersAdminFull, setRiderActive } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, StatCard, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Switch } from "@/components/ui/switch";
import { Bike } from "lucide-react";

type Resp = Awaited<ReturnType<typeof listRidersAdminFull>>;

export default function AdminRiders() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const listFn = useServerFn(listRidersAdminFull);
  const toggleFn = useServerFn(setRiderActive);
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await listFn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [listFn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (id: string, active: boolean) => {
    setBusy(id);
    try { await toggleFn({ data: { passcode, rider_id: id, active } }); await load(); }
    catch (e) { onError(e); } finally { setBusy(null); }
  };

  if (!passcode) return null;
  const riders = data?.riders ?? [];

  return (
    <AdminShell title="Riders" subtitle="Delivery partners and commission owed">
      <Helmet><title>Riders — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total riders" value={riders.length} />
        <StatCard label="Active" value={riders.filter((r) => r.active).length} />
        <StatCard label="Commission owed" value={`Le ${riders.reduce((s, r) => s + r.owed, 0).toLocaleString()}`} />
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Vehicle</th><th className="p-3 text-right">Deliveries</th><th className="p-3 text-right">Owed</th><th className="p-3">Joined</th><th className="p-3">Active</th></tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 flex items-center gap-2"><Bike className="h-3.5 w-3.5 text-muted-foreground" /> <span className="font-medium">{r.display_name}</span></td>
                <td className="p-3 font-mono text-xs">{r.phone}</td>
                <td className="p-3 text-xs">{r.vehicle || "—"}</td>
                <td className="p-3 text-right tabular-nums">{r.deliveries}</td>
                <td className="p-3 text-right tabular-nums">Le {r.owed.toLocaleString()}</td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3"><Switch checked={r.active} disabled={busy === r.id} onCheckedChange={(v) => void toggle(r.id, v)} /></td>
              </tr>
            ))}
            {!riders.length && <EmptyRow colSpan={7}>No riders registered yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
