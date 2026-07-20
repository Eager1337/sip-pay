import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, Truck, Loader2, Package } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { verifyCheckoutSession, getOrderStatus } from "@/lib/checkout.functions";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  status: string;
  total_leones: number;
  items: Array<{ slug: string; name: string; qty: number; price: number }>;
  customer_name: string;
  phone: string;
  address: string;
  notes: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "amber", icon: Clock, blurb: "Complete the mobile money prompt on your phone." },
  paid:             { label: "Paid",             tone: "green", icon: CheckCircle2, blurb: "Payment confirmed. We'll dispatch shortly." },
  payment_failed:   { label: "Payment failed",   tone: "red",   icon: XCircle, blurb: "Payment didn't go through. You can retry checkout." },
  payment_cancelled:{ label: "Payment cancelled",tone: "red",   icon: XCircle, blurb: "You cancelled the payment." },
  payment_expired:  { label: "Payment expired",  tone: "red",   icon: XCircle, blurb: "The payment window expired." },
  cod_pending:      { label: "Cash on delivery — pending", tone: "sea", icon: Package, blurb: "Our team will call to confirm delivery." },
  delivered:        { label: "Delivered",        tone: "green", icon: Truck, blurb: "Order delivered. Enjoy!" },
  cancelled:        { label: "Cancelled",        tone: "red",   icon: XCircle, blurb: "This order was cancelled." },
};

const toneClass = (tone: string) => ({
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-green-100 text-green-800 border-green-200",
  red:   "bg-red-100 text-red-800 border-red-200",
  sea:   "bg-sky-100 text-sky-800 border-sky-200",
}[tone] ?? "bg-muted");

const OrderPage = () => {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const verifyFn = useServerFn(verifyCheckoutSession);
  const getOrderFn = useServerFn(getOrderStatus);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    const load = async () => {
      const o = await getOrderFn({ data: { order_id: id } });
      if (!cancelled) {
        setOrder(o as OrderRow | null);
        setLoading(false);
      }
    };

    const runVerify = async () => {
      if (sp.get("paid") === "1") {
        try {
          const r = await verifyFn({ data: { order_id: id } });
          if (r.paid) toast.success("Payment received — thank you!");
        } catch (e) { console.warn(e); }
        setSp((prev) => { const p = new URLSearchParams(prev); p.delete("paid"); return p; }, { replace: true });
      }
      if (sp.get("cancelled") === "1") {
        toast.info("Payment cancelled.");
        setSp((prev) => { const p = new URLSearchParams(prev); p.delete("cancelled"); return p; }, { replace: true });
      }
    };

    void runVerify().then(load);
    // Poll for updates while payment pending
    interval = setInterval(() => {
      if (cancelled) return;
      void load();
    }, 5000);

    return () => { cancelled = true; if (interval) clearInterval(interval); };
     
  }, [id]);

  if (!id) return null;
  const meta = order ? (STATUS_META[order.status] ?? { label: order.status, tone: "sea", icon: Package, blurb: "" }) : null;
  const Icon = meta?.icon ?? Loader2;

  return (
    <Layout>
      <Helmet>
        <title>Order {id.slice(0, 8)} — KK Drinks</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          <div>
            <p className="eyebrow text-muted-foreground">Order</p>
            <h1 className="display text-3xl md:text-4xl">#{id.slice(0, 8)}</h1>
          </div>

          {loading && !order ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !order ? (
            <div className="rounded-xl border bg-white p-12 text-center space-y-3">
              <XCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p>Order not found.</p>
              <Link to="/store"><Button>Back to store</Button></Link>
            </div>
          ) : (
            <>
              <div className={`rounded-xl border p-6 ${toneClass(meta!.tone)}`}>
                <div className="flex items-center gap-3">
                  <Icon className="h-8 w-8" />
                  <div>
                    <div className="text-lg font-semibold">{meta!.label}</div>
                    <div className="text-sm opacity-80">{meta!.blurb}</div>
                  </div>
                </div>
                {order.status === "awaiting_payment" && (
                  <p className="text-xs mt-3 opacity-70">This page refreshes automatically.</p>
                )}
              </div>

              <div className="rounded-xl border bg-white p-6 space-y-3">
                <h2 className="display text-xl">Items</h2>
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{it.name} × {it.qty}</span>
                    <span className="tabular-nums">Le {it.price * it.qty}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2">
                  <span>Total</span>
                  <span className="display text-xl">Le {order.total_leones}</span>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 space-y-2 text-sm">
                <h2 className="display text-xl mb-2">Delivery</h2>
                <div><span className="text-muted-foreground">Name:</span> {order.customer_name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {order.phone}</div>
                <div><span className="text-muted-foreground">Address:</span> {order.address}</div>
                {order.notes && <div><span className="text-muted-foreground">Notes:</span> {order.notes}</div>}
                {order.payment_method && (
                  <div><span className="text-muted-foreground">Payment:</span> {order.payment_method.replace("_", " ")}</div>
                )}
              </div>

              <div className="flex gap-3">
                <Link to="/store"><Button variant="outline">Keep shopping</Button></Link>
                {(order.status === "payment_failed" || order.status === "payment_cancelled" || order.status === "payment_expired") && (
                  <Link to="/checkout"><Button className="bg-[hsl(var(--sea))]">Retry payment</Button></Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrderPage;
