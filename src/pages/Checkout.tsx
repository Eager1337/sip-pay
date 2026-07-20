import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, cartTotal } from "@/lib/cart";
import { DRINKS } from "@/data/drinks";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { createCodOrder } from "@/lib/orders.functions";
import { track } from "@/lib/analytics";
import { Smartphone, Truck, ShoppingBag } from "lucide-react";

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Name too short").max(100),
  phone: z.string().trim().min(6, "Phone too short").max(30),
  address: z.string().trim().min(4, "Add a delivery address").max(300),
  notes: z.string().trim().max(500).optional(),
});

type PaymentMethod = "orange_money" | "afrimoney" | "cod";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const total = cartTotal(items);
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", notes: "" });
  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [submitting, setSubmitting] = useState(false);
  const createCheckout = useServerFn(createCheckoutSession);
  const createCod = useServerFn(createCodOrder);

  const submit = async () => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (items.length === 0) { toast.error("Your cart is empty."); return; }

    setSubmitting(true);
    const itemsPayload = items.map((c) => {
      const d = DRINKS.find((x) => x.slug === c.slug)!;
      return { slug: d.slug, name: d.name, qty: c.qty, price: d.price };
    });

    void track("checkout_submit", { method, item_count: itemsPayload.length, total });

    try {
      if (method === "cod") {
        const r = await createCod({ data: { items: itemsPayload, customer: {
          customer_name: parsed.data.customer_name, phone: parsed.data.phone,
          address: parsed.data.address, notes: parsed.data.notes ?? null,
        } } });
        if (!r.ok) { toast.error(r.error); setSubmitting(false); return; }
        clear();
        navigate(`/order/${r.order_id}`);
        return;
      }

      const r = await createCheckout({ data: {
        items: itemsPayload,
        customer: {
          customer_name: parsed.data.customer_name, phone: parsed.data.phone,
          address: parsed.data.address, notes: parsed.data.notes ?? null,
        },
        origin: window.location.origin,
        payment_method: method,
      } });
      if (!r.ok) {
        toast.error(r.error ?? "Could not start checkout");
        setSubmitting(false);
        return;
      }
      clear();
      window.location.href = r.url;
    } catch (e) {
      console.error(e);
      toast.error("Checkout failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Checkout — KK Drinks Sierra Leone</title>
        <meta name="description" content="Pay with Orange Money, Afrimoney, or cash on delivery. Fresh drinks delivered across Sierra Leone." />
      </Helmet>

      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="display text-4xl md:text-5xl mb-8">Checkout</h1>

          {items.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center space-y-4">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link to="/store"><Button>Browse drinks</Button></Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_400px] gap-8">
              <div className="space-y-8">
                {/* Contact */}
                <section className="rounded-xl border bg-white p-6 space-y-4">
                  <h2 className="display text-2xl">Delivery details</h2>
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" maxLength={100} value={form.customer_name}
                           onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone (Orange/Afrimoney number)</Label>
                      <Input id="phone" maxLength={30} placeholder="+232 …" value={form.phone}
                             onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="addr">Delivery area</Label>
                      <Input id="addr" maxLength={300} placeholder="Freetown, …" value={form.address}
                             onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" maxLength={500} rows={2} value={form.notes}
                              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </section>

                {/* Payment method */}
                <section className="rounded-xl border bg-white p-6 space-y-4">
                  <h2 className="display text-2xl">Payment method</h2>
                  <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}
                              className="space-y-3">
                    <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="orange_money" id="pm-orange" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <Smartphone className="h-4 w-4 text-orange-500" /> Orange Money
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pay instantly from your Orange Money wallet. You'll be redirected to complete payment.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="afrimoney" id="pm-afri" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <Smartphone className="h-4 w-4 text-red-600" /> Afrimoney
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pay from your Afrimoney (Africell) wallet.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="cod" id="pm-cod" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <Truck className="h-4 w-4" /> Cash on delivery
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pay when we deliver. Our team will call to confirm.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </section>
              </div>

              {/* Summary */}
              <aside className="rounded-xl border bg-white p-6 space-y-4 h-fit lg:sticky lg:top-24">
                <h2 className="display text-2xl">Order summary</h2>
                <div className="space-y-2">
                  {items.map((it) => {
                    const d = DRINKS.find((x) => x.slug === it.slug);
                    if (!d) return null;
                    return (
                      <div key={it.slug} className="flex items-center gap-3 text-sm">
                        <img src={d.image} alt={d.name} className="h-10 w-10 object-contain" />
                        <div className="flex-1 min-w-0 truncate">
                          {d.short} <span className="text-muted-foreground">× {it.qty}</span>
                        </div>
                        <div className="tabular-nums">Le {d.price * it.qty}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="display text-xl">Le {total}</span>
                </div>
                <Button size="lg" onClick={submit} disabled={submitting}
                        className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                  {submitting ? "Processing…" :
                   method === "cod" ? `Place order · Le ${total}` :
                   `Pay Le ${total} with ${method === "orange_money" ? "Orange Money" : "Afrimoney"}`}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Payments secured by Monime.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
