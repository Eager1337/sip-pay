// /admin/webhooks — Monime webhook delivery log.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listWebhookEventsAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Check, X } from "lucide-react";

type Resp = Awaited<ReturnType<typeof listWebhookEventsAdmin>>;

export default function AdminWebhooks() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(listWebhookEventsAdmin);
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
    <AdminShell title="Webhooks" subtitle="Monime payment callback log">
      <Helmet><title>Webhooks — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">When</th><th className="p-3">Provider</th><th className="p-3">Event</th><th className="p-3">Order</th><th className="p-3">Verified</th><th className="p-3">Applied</th><th className="p-3">Error</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t align-top">
                <td className="p-3 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs">{e.provider}</td>
                <td className="p-3 text-xs">{e.event_type ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{e.order_id ? String(e.order_id).slice(0, 8) : "—"}</td>
                <td className="p-3">{e.verified ? <Check className="h-4 w-4 text-[hsl(var(--leaf))]" /> : <X className="h-4 w-4 text-red-500" />}</td>
                <td className="p-3">{e.applied ? <Check className="h-4 w-4 text-[hsl(var(--leaf))]" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                <td className="p-3 text-xs text-red-600 max-w-[220px] truncate">{e.error ?? ""}</td>
              </tr>
            ))}
            {!events.length && <EmptyRow colSpan={7}>No webhook events yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
