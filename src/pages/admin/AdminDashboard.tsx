// /admin/dashboard — KPI overview + recent orders + status breakdown.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboard } from "@/lib/admin-extras.functions";
import { AdminShell, StatCard, Card, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { RefreshCw, TrendingUp, Clock, AlertTriangle } from "lucide-react";

type Resp = Awaited<ReturnType<typeof getAdminDashboard>>;

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-[hsl(var(--leaf))]", delivered: "bg-[hsl(var(--sea))]",
  out_for_delivery: "bg-[hsl(var(--sun))]", awaiting_payment: "bg-[hsl(var(--mango))]",
  cod_pending: "bg-orange-400", cancelled: "bg-red-400", payment_failed: "bg-red-500",
};

export default function AdminDashboard() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(getAdminDashboard);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true);
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); } finally { setLoading(false); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;

  return (
    <AdminShell title="Dashboard" subtitle="Storefront at a glance" actions={
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 text-xs rounded-md border px-3 py-1.5 hover:bg-muted">
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
      </button>
    }>
      <Helmet><title>Dashboard — KK Admin</title><meta name="robots" content="noindex" /></Helmet>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue (paid+)" value={`Le ${data?.revenue.toLocaleString() ?? 0}`} hint={`Le ${data?.last24Revenue.toLocaleString() ?? 0} last 24h`} />
        <StatCard label="Total orders" value={data?.totalOrders ?? 0} hint={`${data?.recent24 ?? 0} in last 24h`} />
        <StatCard label="Pending" value={data?.pending ?? 0} hint="Awaiting fulfilment" />
        <StatCard label="Avg rating" value={data?.avgRating ? `${data.avgRating}★` : "—"} hint={`${data?.reviews ?? 0} reviews`} />
        <StatCard label="Active riders" value={data?.activeRiders ?? 0} hint={`${data?.totalRiders ?? 0} total`} />
        <StatCard label="Payouts owed" value={`Le ${data?.owedPayouts.toLocaleString() ?? 0}`} hint={`${data?.pendingPayouts ?? 0} unpaid`} />
        <StatCard label="Wholesale leads" value={data?.wholesaleLeads ?? 0} hint="Uncontacted" />
        <StatCard label="Delivery zones" value={data?.activeZones ?? 0} hint="Active at checkout" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Recent orders">
          <div className="divide-y">
            {(data?.recent ?? []).map((o: { id: string; customer_name: string; status: string; total_leones: number; created_at: string }) => (
              <Link key={o.id} to="/admin/orders" className="flex items-center justify-between py-2 hover:bg-muted/40 -mx-1 px-1 rounded">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums">Le {o.total_leones.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{o.status.replace(/_/g, " ")}</p>
                </div>
              </Link>
            ))}
            {!data?.recent.length && <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>}
          </div>
        </Card>

        <Card title="Orders by status">
          <div className="space-y-2">
            {Object.entries(data?.statusCounts ?? {}).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
              const max = Math.max(...Object.values(data?.statusCounts ?? { _: 1 }));
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize">{status.replace(/_/g, " ")}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${STATUS_COLORS[status] ?? "bg-gray-400"}`} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {!data?.totalOrders && <p className="text-sm text-muted-foreground py-4 text-center">No data.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/orders" className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--sea))] mb-2" />
          <p className="text-sm font-semibold">Manage orders</p>
          <p className="text-xs text-muted-foreground">Update status & mark paid</p>
        </Link>
        <Link to="/admin/riders" className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
          <Clock className="h-5 w-5 text-[hsl(var(--mango))] mb-2" />
          <p className="text-sm font-semibold">Rider operations</p>
          <p className="text-xs text-muted-foreground">Assign & track deliveries</p>
        </Link>
        <Link to="/admin/reviews" className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--berry))] mb-2" />
          <p className="text-sm font-semibold">Moderate reviews</p>
          <p className="text-xs text-muted-foreground">{data?.hiddenReviews ?? 0} hidden</p>
        </Link>
      </div>
    </AdminShell>
  );
}
