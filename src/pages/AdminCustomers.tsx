import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, useAdminPass, handleAdminError, leones } from "./AdminShell";
import { listCustomers, updateOrderStatus } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Customer = Awaited<ReturnType<typeof listCustomers>>["customers"][number];

export default function AdminCustomers() {
  const pass = useAdminPass();
  const navigate = useNavigate();
  const list = useServerFn(listCustomers);
  const upd = useServerFn(updateOrderStatus);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Customer[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!pass) return;
    setLoading(true);
    try { setRows((await list({ data: { passcode: pass, search } })).customers); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
    finally { setLoading(false); }
  }, [pass, search, list, navigate]);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "mark_paid" | "mark_delivered" | "cancel") => {
    try { await upd({ data: { passcode: pass, order_id: id, action } }); toast.success("Order updated"); void load(); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
  };

  return (
    <AdminShell title="Customers">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Search name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{rows.length} customers</p>
      <div className="space-y-2">
        {rows.map((c) => (
          <div key={c.key} className="rounded-xl border bg-card">
            <button className="w-full text-left p-4 flex flex-wrap items-center gap-x-6 gap-y-1" onClick={() => setOpen(open === c.key ? null : c.key)}>
              <span className="font-semibold min-w-40">{c.name}</span>
              <span className="text-sm">{c.phone}</span>
              <span className="text-sm text-muted-foreground">{c.area ?? "—"}</span>
              <span className="text-sm">{c.orders} orders</span>
              <span className="text-sm font-medium">{leones(c.spent_leones)} spent</span>
              <span className="text-xs text-muted-foreground ml-auto">Last {new Date(c.last_order_at).toLocaleDateString()}</span>
            </button>
            {open === c.key && (
              <div className="border-t p-4 space-y-2">
                {c.email && <p className="text-sm">Email: {c.email}</p>}
                {c.recent.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link to={`/order/${o.id}`} className="underline font-mono">#{o.id.slice(0, 8).toUpperCase()}</Link>
                    <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                    <span>{leones(o.total_leones)}</span>
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => act(o.id, "mark_paid")}>Paid</Button>
                      <Button size="sm" variant="outline" onClick={() => act(o.id, "mark_delivered")}>Delivered</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(o.id, "cancel")}>Cancel</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No customers yet.</p>}
      </div>
    </AdminShell>
  );
}
