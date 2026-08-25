// /admin/customers — aggregated customer list from orders.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listCustomersAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Resp = Awaited<ReturnType<typeof listCustomersAdmin>>;

export default function AdminCustomers() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(listCustomersAdmin);
  const [data, setData] = useState<Resp | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true);
    try { setData(await fn({ data: { passcode, search } })); }
    catch (e) { onError(e); } finally { setLoading(false); }
  }, [fn, passcode, search, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;

  return (
    <AdminShell title="Customers" subtitle="Aggregated from order history" actions={
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()}
               placeholder="Search name or phone…" className="pl-8 h-9 w-56" />
      </div>
    }>
      <Helmet><title>Customers — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Address</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Spent</th><th className="p-3">Last order</th></tr>
          </thead>
          <tbody>
            {(data?.customers ?? []).map((c, i) => (
              <tr key={i} className="border-t align-top">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 font-mono text-xs">{c.phone}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-[220px] truncate">{c.address}</td>
                <td className="p-3 text-right tabular-nums">{c.orders}</td>
                <td className="p-3 text-right tabular-nums">Le {c.spent.toLocaleString()}</td>
                <td className="p-3 text-xs">{new Date(c.lastOrder).toLocaleDateString()}</td>
              </tr>
            ))}
            {!data?.customers.length && !loading && <EmptyRow colSpan={6}>No customers yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
