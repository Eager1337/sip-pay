// /admin/wholesale — wholesale enquiry leads.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listWholesaleLeadsAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";

type Resp = Awaited<ReturnType<typeof listWholesaleLeadsAdmin>>;

export default function AdminWholesale() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(listWholesaleLeadsAdmin);
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;
  const leads = data?.leads ?? [];

  return (
    <AdminShell title="Wholesale leads" subtitle="Bulk & business enquiries">
      <Helmet><title>Wholesale leads — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Name</th><th className="p-3">Business</th><th className="p-3">Contact</th><th className="p-3">Region</th><th className="p-3">Quantity</th><th className="p-3">Message</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-3 font-medium">{l.full_name}</td>
                <td className="p-3 text-xs">{l.business_name ?? "—"}</td>
                <td className="p-3 text-xs"><div className="font-mono">{l.phone}</div><div className="text-muted-foreground">{l.email}</div></td>
                <td className="p-3 text-xs">{l.region ?? "—"}</td>
                <td className="p-3 text-xs">{l.estimated_quantity ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-[280px]">{l.message ?? "—"}</td>
                <td className="p-3 text-xs">{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!leads.length && <EmptyRow colSpan={7}>No wholesale leads yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
