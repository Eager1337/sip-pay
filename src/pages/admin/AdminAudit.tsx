// /admin/audit — order events timeline (status changes, notes, system events).
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { listOrderEventsAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";

type Resp = Awaited<ReturnType<typeof listOrderEventsAdmin>>;

const EVENT_TONE: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-700",
  note: "bg-muted text-muted-foreground",
  rider_accepted: "bg-[hsl(var(--mango))]/20 text-[hsl(var(--mango))]",
  delivered: "bg-[hsl(var(--leaf))]/20 text-[hsl(var(--leaf))]",
  customer_confirmed: "bg-[hsl(var(--sea))]/20 text-[hsl(var(--sea))]",
};

export default function AdminAudit() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(listOrderEventsAdmin);
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;
  const events = data?.events ?? [];

  return (
    <AdminShell title="Audit log" subtitle="Order event timeline">
      <Helmet><title>Audit log — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="rounded-xl border bg-white divide-y">
        {events.map((e) => (
          <div key={e.id} className="flex gap-3 p-3">
            <div className="text-xs text-muted-foreground whitespace-nowrap w-32 pt-0.5">
              {new Date(e.created_at).toLocaleString()}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${EVENT_TONE[e.event_type] ?? "bg-muted text-muted-foreground"}`}>
              {e.event_type.replace(/_/g, " ")}
            </span>
            <div className="min-w-0 text-sm">
              <Link to="/admin/orders" className="font-mono text-xs text-[hsl(var(--sea))] hover:underline">{String(e.order_id).slice(0, 8)}</Link>
              {e.from_status && e.to_status && <span className="text-xs text-muted-foreground"> · {e.from_status.replace(/_/g, " ")} → {e.to_status.replace(/_/g, " ")}</span>}
              {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
            </div>
          </div>
        ))}
        {!events.length && <div className="p-8 text-center text-sm text-muted-foreground">No events logged yet.</div>}
      </div>
    </AdminShell>
  );
}
