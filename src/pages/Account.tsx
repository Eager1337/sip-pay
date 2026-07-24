import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listMyOrders, type MyOrderRow } from "@/lib/orders.functions";
import { Package, Loader2, CheckCircle2, Clock, XCircle, Truck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  awaiting_payment: { label: "Awaiting payment", cls: "bg-amber-100 text-amber-800", Icon: Clock },
  paid:             { label: "Paid",             cls: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  payment_failed:   { label: "Payment failed",   cls: "bg-red-100 text-red-800", Icon: XCircle },
  payment_cancelled:{ label: "Cancelled",        cls: "bg-red-100 text-red-800", Icon: XCircle },
  payment_expired:  { label: "Expired",          cls: "bg-red-100 text-red-800", Icon: XCircle },
  cod_pending:      { label: "Cash on delivery", cls: "bg-sky-100 text-sky-800", Icon: Package },
  out_for_delivery: { label: "Out for delivery", cls: "bg-sky-100 text-sky-800", Icon: Truck },
  delivered:        { label: "Delivered",        cls: "bg-emerald-100 text-emerald-800", Icon: Truck },
  cancelled:        { label: "Cancelled",        cls: "bg-red-100 text-red-800", Icon: XCircle },
};

const STORAGE_KEY = "kk_buyer_phone";

const AccountPage = () => {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<MyOrderRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const list = useServerFn(listMyOrders);

  const load = async (p: string) => {
    const clean = p.trim();
    if (clean.length < 6) { toast.error("Enter your phone number"); return; }
    setLoading(true);
    try {
      const r = await list({ data: { phone: clean } });
      setOrders(r.orders);
      localStorage.setItem(STORAGE_KEY, clean);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load orders");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { setPhone(saved); void load(saved); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPhone(""); setOrders(null);
  };

  return (
    <Layout>
      <Helmet>
        <title>My Orders — KK Drinks Sierra Leone</title>
        <meta name="description" content="View your KK Drinks orders, payment status, and live delivery tracking." />
      </Helmet>

      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="display text-4xl md:text-5xl mb-2">My orders</h1>
          <p className="text-muted-foreground mb-8">Enter the phone number you used at checkout to see your order history and delivery status.</p>

          <div className="rounded-xl border bg-white p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Label htmlFor="ph">Phone number</Label>
                <Input id="ph" placeholder="+232 …" value={phone} maxLength={30}
                       onChange={(e) => setPhone(e.target.value)}
                       onKeyDown={(e) => { if (e.key === "Enter") void load(phone); }} />
              </div>
              <Button onClick={() => load(phone)} disabled={loading}
                      className="bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "View orders"}
              </Button>
              {orders && <Button variant="ghost" onClick={signOut}>Clear</Button>}
            </div>
          </div>

          {orders === null ? null : orders.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center space-y-4">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No orders found for this number.</p>
              <Link to="/store"><Button>Browse drinks</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => {
                const meta = STATUS_STYLE[o.status] ?? { label: o.status, cls: "bg-muted", Icon: Package };
                const Icon = meta.Icon;
                const count = o.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <Link to={`/order/${o.id}`} key={o.id}
                        className="block rounded-xl border bg-white p-5 hover:shadow-md transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${meta.cls}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {new Date(o.created_at).toLocaleString()} · {count} item{count > 1 ? "s" : ""}
                          {o.payment_method && ` · ${o.payment_method.replace(/_/g, " ")}`}
                        </div>
                        <div className="mt-1 text-sm">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</div>
                        {(o.status === "paid" || o.status === "out_for_delivery") && o.delivery_code && (
                          <div className="mt-2 text-xs text-[hsl(var(--wood))]">
                            Delivery code: <span className="font-mono font-bold tracking-widest">{o.delivery_code}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="display text-2xl">Le {o.total_leones}</div>
                        <div className="text-xs text-[hsl(var(--sea))] mt-2 font-semibold">Track order →</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;
