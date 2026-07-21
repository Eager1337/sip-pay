import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOrders, updateOrderStatus } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Search, RefreshCw, CheckCircle2, XCircle, Truck, Ban } from "lucide-react";

type Order = {
  id: string; customer_name: string; phone: string; address: string;
  status: string; total_leones: number; created_at: string; paid_at: string | null;
  payment_method: string | null; delivery_code: string | null;
  items: Array<{ slug: string; name: string; qty: number; price: number }>;
};

const STATUS_OPTIONS = [
  "all", "awaiting_payment", "paid", "cod_pending", "out_for_delivery", "delivered",
  "payment_failed", "payment_cancelled", "payment_expired", "cancelled",
];

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState<string>("");
  const [rows, setRows] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const listFn = useServerFn(listOrders);
  const updateFn = useServerFn(updateOrderStatus);

  useEffect(() => {
    const p = sessionStorage.getItem("kk_admin_pass");
    if (!p) { navigate("/admin"); return; }
    setPasscode(p);
  }, [navigate]);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true);
    try {
      const r = await listFn({ data: { passcode, search, status, page } });
      setRows(r.rows as unknown as Order[]);
      setCount(r.count);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Forbidden")) {
        sessionStorage.removeItem("kk_admin_pass");
        toast.error("Session expired. Please re-enter the passcode.");
        navigate("/admin");
      } else toast.error(msg);
    } finally { setLoading(false); }
  }, [listFn, passcode, search, status, page, navigate]);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "mark_paid" | "mark_failed" | "mark_delivered" | "cancel") => {
    setBusy(id);
    try {
      await updateFn({ data: { passcode, order_id: id, action } });
      toast.success("Updated");
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  const signOut = () => {
    sessionStorage.removeItem("kk_admin_pass");
    navigate("/admin");
  };

  if (!passcode) return null;

  return (
    <Layout>
      <Helmet><title>Admin — Orders</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-6xl px-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="display text-4xl">Orders</h1>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>

          <div className="rounded-xl border bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Search name / phone / id</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                     placeholder="Search…"
                     onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); void load(); } }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setPage(0); void load(); }} disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No orders.</td></tr>
                )}
                {rows.map((o) => (
                  <tr key={o.id} className="border-t align-top">
                    <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                    <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.phone}</div>
                      <div className="text-xs text-muted-foreground">{o.address}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {o.items.map((it, i) => <div key={i}>{it.name} × {it.qty}</div>)}
                    </td>
                    <td className="p-3 tabular-nums">Le {o.total_leones}</td>
                    <td className="p-3 font-mono text-xs">{o.delivery_code ?? "—"}</td>
                    <td className="p-3">
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">{o.status.replace(/_/g, " ")}</span>
                      {o.payment_method && <div className="text-[10px] text-muted-foreground mt-1">{o.payment_method}</div>}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={busy === o.id}
                                onClick={() => act(o.id, "mark_paid")} title="Mark paid">
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === o.id}
                                onClick={() => act(o.id, "mark_delivered")} title="Mark delivered">
                          <Truck className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === o.id}
                                onClick={() => act(o.id, "mark_failed")} title="Mark failed">
                          <XCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === o.id}
                                onClick={() => act(o.id, "cancel")} title="Cancel">
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{count} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * 25 >= count} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminOrdersPage;
