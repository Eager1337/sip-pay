import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, Truck, Loader2, Package, Copy, MapPin, User, Download } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCheckoutSession, getOrderStatus } from "@/lib/checkout.functions";
import { getOrderPublicExtras, customerConfirmReceipt } from "@/lib/delivery.functions";
import { downloadReceipt } from "@/lib/receipt";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  status: string;
  total_leones: number;
  delivery_fee_leones?: number | null;
  discount_leones?: number | null;
  items: Array<{ slug: string; name: string; qty: number; price: number }>;
  customer_name: string;
  phone: string;
  address: string;
  city?: string | null;
  district?: string | null;
  notes: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  monime_transaction_id?: string | null;
  monime_order_number?: string | null;
  payment_failure_reason?: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

type Extras = {
  delivery_code: string | null;
  rider: { display_name: string; phone: string; vehicle: string | null } | null;
  location: { lat: number; lng: number; updated_at: string } | null;
  out_for_delivery_at: string | null;
  customer_confirmed_at: string | null;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "amber", icon: Clock, blurb: "Complete the mobile money prompt on your phone." },
  paid:             { label: "Paid — awaiting rider", tone: "green", icon: CheckCircle2, blurb: "Payment confirmed. A rider will accept soon." },
  payment_failed:   { label: "Payment failed",   tone: "red",   icon: XCircle, blurb: "Payment didn't go through. You can retry checkout." },
  payment_cancelled:{ label: "Payment cancelled",tone: "red",   icon: XCircle, blurb: "You cancelled the payment." },
  payment_expired:  { label: "Payment expired",  tone: "red",   icon: XCircle, blurb: "The payment window expired." },
  cod_pending:      { label: "Cash on delivery — pending", tone: "sea", icon: Package, blurb: "Our team will call to confirm delivery." },
  out_for_delivery: { label: "Out for delivery",  tone: "sea", icon: Truck, blurb: "Your rider is on the way. Give them the 6-digit code on arrival." },
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
  const [extras, setExtras] = useState<Extras | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCode, setConfirmCode] = useState("");
  const verifyFn = useServerFn(verifyCheckoutSession);
  const getOrderFn = useServerFn(getOrderStatus);
  const getExtrasFn = useServerFn(getOrderPublicExtras);
  const confirmFn = useServerFn(customerConfirmReceipt);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, ex] = await Promise.all([
      getOrderFn({ data: { order_id: id } }),
      getExtrasFn({ data: { order_id: id } }),
    ]);
    setOrder(o as OrderRow | null);
    setExtras(ex as Extras | null);
    setLoading(false);
  }, [id, getOrderFn, getExtrasFn]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

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
    const interval = setInterval(() => { if (!cancelled) void load(); }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyCode = () => {
    if (!extras?.delivery_code) return;
    navigator.clipboard.writeText(extras.delivery_code);
    toast.success("Code copied");
  };

  const confirmReceipt = async () => {
    if (!id) return;
    try {
      await confirmFn({ data: { order_id: id, delivery_code: confirmCode } });
      toast.success("Delivery confirmed. Payment released to the rider.");
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (!id) return null;
  const meta = order ? (STATUS_META[order.status] ?? { label: order.status, tone: "sea", icon: Package, blurb: "" }) : null;
  const Icon = meta?.icon ?? Loader2;
  const showCode = extras?.delivery_code && ["paid", "out_for_delivery", "delivered"].includes(order?.status ?? "");
  const canConfirm = order?.status === "out_for_delivery" && !extras?.customer_confirmed_at;

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

              {showCode && (
                <div className="rounded-xl border-2 border-[hsl(var(--sun))] bg-[hsl(var(--sun))]/10 p-6">
                  <p className="eyebrow text-[hsl(var(--wood))]">Your delivery code</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="display text-5xl tracking-[0.4em] tabular-nums">{extras.delivery_code}</div>
                    <Button size="sm" variant="outline" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Give this 6-digit code to the delivery rider on arrival. It confirms delivery and releases payment.
                  </p>
                </div>
              )}

              {extras?.rider && (
                <div className="rounded-xl border bg-white p-6 space-y-2">
                  <h2 className="display text-xl flex items-center gap-2"><User className="h-5 w-5" /> Your rider</h2>
                  <div className="text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {extras.rider.display_name}</div>
                    <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${extras.rider.phone}`} className="underline">{extras.rider.phone}</a></div>
                    {extras.rider.vehicle && <div><span className="text-muted-foreground">Vehicle:</span> {extras.rider.vehicle}</div>}
                  </div>
                  {extras.location && (
                    <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Last location: {extras.location.lat.toFixed(4)}, {extras.location.lng.toFixed(4)}
                      {" · "}
                      <a
                        href={`https://www.google.com/maps?q=${extras.location.lat},${extras.location.lng}`}
                        target="_blank" rel="noreferrer"
                        className="underline"
                      >open in map</a>
                      {" · "}
                      updated {new Date(extras.location.updated_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              {canConfirm && (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 space-y-3">
                  <h2 className="display text-xl">Confirm delivery</h2>
                  <p className="text-sm text-muted-foreground">
                    Once you receive your order, enter your 6-digit code below (or give it to the rider). This releases their payment.
                  </p>
                  <div className="flex gap-2">
                    <Input maxLength={6} value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="6-digit code" />
                    <Button onClick={confirmReceipt} disabled={confirmCode.length < 4} className="bg-green-600 hover:bg-green-700">
                      Confirm receipt
                    </Button>
                  </div>
                </div>
              )}

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

              {order.payment_failure_reason && (order.status === "payment_failed" || order.status === "payment_cancelled" || order.status === "payment_expired") && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <div className="font-semibold mb-1">Why the payment did not go through</div>
                  <div>{order.payment_failure_reason}</div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link to="/store"><Button variant="outline">Keep shopping</Button></Link>
                <Link to="/account"><Button variant="outline">My orders</Button></Link>
                {order.status === "paid" || order.status === "out_for_delivery" || order.status === "delivered" ? (
                  <Button variant="outline" onClick={() => downloadReceipt({
                    ...order,
                    delivery_code: extras?.delivery_code ?? null,
                  })}>
                    <Download className="h-4 w-4 mr-2" /> Download receipt
                  </Button>
                ) : null}
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
