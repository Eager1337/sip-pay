import { useMemo, useState } from "react";
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
import { Smartphone, Truck, ShoppingBag, CreditCard, Loader2, ShieldCheck } from "lucide-react";

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email or leave it empty").max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Enter your phone number").max(30),
  address: z.string().trim().min(4, "Add a delivery address").max(300),
  city: z.string().trim().min(2, "Enter your city or town").max(80),
  district: z.string().trim().min(2, "Enter your district").max(80),
  momo: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
});

type PaymentMethod = "cod" | "afrimoney" | "orange_money" | "card";

const METHODS: Array<{
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: typeof Smartphone;
  tone: string;
}> = [
  { value: "cod", label: "Cash on delivery", hint: "Pay the rider in cash when your drinks arrive.", icon: Truck, tone: "text-foreground" },
  { value: "afrimoney", label: "AfriMoneySL", hint: "Africell wallet. Dial *161# on your phone to approve the payment.", icon: Smartphone, tone: "text-[#a2007d]" },
  { value: "orange_money", label: "OrangeMoneySL", hint: "Orange wallet. Dial #144# on your phone to approve the payment.", icon: Smartphone, tone: "text-orange-500" },
  { value: "card", label: "VisaCard", hint: "Pay securely with Visa or Mastercard.", icon: CreditCard, tone: "text-sky-600" },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const subtotal = cartTotal(items);
  const [form, setForm] = useState({
    customer_name: "", email: "", phone: "", address: "", city: "", district: "Western Area", momo: "", notes: "",
  });
  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [submitting, setSubmitting] = useState(false);
  const createCheckout = useServerFn(createCheckoutSession);
  const createCod = useServerFn(createCodOrder);

  const isMomo = method === "afrimoney" || method === "orange_money";
  const deliveryFee = useMemo(() => {
    const d = form.district.toLowerCase();
    return d.includes("western") || d.includes("freetown") ? 15 : 25;
  }, [form.district]);
  const discount = subtotal >= 120 ? 10 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const submit = async () => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (items.length === 0) { toast.error("Your cart is empty."); return; }
    if (isMomo && !parsed.data.momo?.trim()) {
      toast.error("Enter the mobile money number registered to this wallet.");
      return;
    }

    setSubmitting(true);
    const itemsPayload = items.map((c) => {
      const d = DRINKS.find((x) => x.slug === c.slug)!;
      return { slug: d.slug, name: d.name, qty: c.qty, price: d.price };
    });

    void track("store_form_submit", { method, item_count: itemsPayload.length, total });

    const customer = {
      customer_name: parsed.data.customer_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      district: parsed.data.district,
      notes: parsed.data.notes || null,
    };

    try {
      if (method === "cod") {
        const r = await createCod({ data: { items: itemsPayload, customer } });
        if (!r.ok) { toast.error(r.error); setSubmitting(false); return; }
        clear();
        toast.success("Order placed — we'll call you to confirm delivery.");
        navigate(`/order/${r.order_id}`);
        return;
      }

      const r = await createCheckout({ data: {
        items: itemsPayload,
        customer: { ...customer, mobile_money_number: parsed.data.momo || null },
        origin: window.location.origin,
        payment_method: method === "card" ? "card" : method,
      } });

      if (!r.ok) {
        toast.error(r.error ?? "We couldn't open the payment page. Please check your number and try again.");
        setSubmitting(false);
        return;
      }
      toast.success(
        isMomo
          ? `Opening secure payment — approve the prompt (${method === "afrimoney" ? "*161#" : "#144#"}) on your phone.`
          : "Opening secure card payment…",
      );
      // Cart stays until payment succeeds so nothing is lost if the buyer cancels.
      window.location.href = r.url;
    } catch (e) {
      console.error(e);
      toast.error("The payment service didn't respond. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  const activeMethod = METHODS.find((m) => m.value === method)!;

  return (
    <Layout>
      <Helmet>
        <title>Secure checkout — KK Drinks Sierra Leone</title>
        <meta name="description" content="Pay with OrangeMoneySL, AfriMoneySL, VisaCard or cash on delivery. Fresh drinks delivered across Sierra Leone." />
      </Helmet>

      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Cart</span><span>→</span>
            <span className="font-semibold text-foreground">Checkout</span><span>→</span>
            <span>Payment</span><span>→</span><span>Confirmation</span>
          </div>
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
                <section className="rounded-xl border bg-white p-6 space-y-4">
                  <h2 className="display text-2xl">Delivery details</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" maxLength={100} value={form.customer_name}
                             onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email (optional — for your receipt)</Label>
                      <Input id="email" type="email" maxLength={255} value={form.email}
                             onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone / WhatsApp number</Label>
                      <Input id="phone" maxLength={30} placeholder="+232 …" value={form.phone}
                             onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="city">City / town</Label>
                      <Input id="city" maxLength={80} placeholder="Freetown" value={form.city}
                             onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input id="district" maxLength={80} placeholder="Western Area" value={form.district}
                             onChange={(e) => setForm({ ...form, district: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="addr">Delivery address</Label>
                      <Input id="addr" maxLength={300} placeholder="Street, landmark…" value={form.address}
                             onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Delivery notes (optional)</Label>
                    <Textarea id="notes" maxLength={500} rows={2} value={form.notes}
                              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </section>

                <section className="rounded-xl border bg-white p-6 space-y-4">
                  <h2 className="display text-2xl">Payment method</h2>
                  <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-3">
                    {METHODS.map((m) => (
                      <label key={m.value}
                             className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 ${method === m.value ? "border-[hsl(var(--sea))] bg-[hsl(var(--sea))]/5" : ""}`}>
                        <RadioGroupItem value={m.value} id={`pm-${m.value}`} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <m.icon className={`h-4 w-4 ${m.tone}`} /> {m.label}
                          </div>
                          <p className="text-sm text-muted-foreground">{m.hint}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  {isMomo && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      <Label htmlFor="momo">
                        {method === "afrimoney" ? "AfriMoneySL" : "OrangeMoneySL"} number
                      </Label>
                      <Input id="momo" maxLength={30} placeholder="+232 …" value={form.momo}
                             onChange={(e) => setForm({ ...form, momo: e.target.value })} />
                      <p className="text-xs text-muted-foreground">
                        Keep your phone nearby — approve the payment prompt, or dial{" "}
                        <strong>{method === "afrimoney" ? "*161#" : "#144#"}</strong> if it doesn't appear.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <aside className="rounded-xl border bg-white p-6 space-y-4 h-fit lg:sticky lg:top-24">
                <h2 className="display text-2xl">Order summary</h2>
                <div className="space-y-3">
                  {items.map((it) => {
                    const d = DRINKS.find((x) => x.slug === it.slug);
                    if (!d) return null;
                    return (
                      <div key={it.slug} className="flex items-center gap-3 text-sm">
                        <img src={d.image} alt={d.name} className="h-12 w-12 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.volume} · Le {d.price} × {it.qty}
                          </div>
                        </div>
                        <div className="tabular-nums">Le {d.price * it.qty}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">Le {subtotal}</span></div>
                  <div className="flex justify-between"><span>Delivery fee</span><span className="tabular-nums">Le {deliveryFee}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-700"><span>Bulk discount</span><span className="tabular-nums">− Le {discount}</span></div>
                  )}
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="display text-xl">Le {total}</span>
                </div>
                <Button size="lg" onClick={submit} disabled={submitting}
                        className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                  {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>)
                    : method === "cod" ? `Place order · Le ${total}`
                    : `Pay Le ${total} with ${activeMethod.label}`}
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Payments are processed securely by Monime. Your order is only
                  confirmed once payment succeeds.
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
