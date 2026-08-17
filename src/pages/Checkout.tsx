import { useEffect, useMemo, useState } from "react";
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
import { useCart, cartTotal, verifyCart } from "@/lib/cart";
import { DRINKS } from "@/data/drinks";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { createCodOrder } from "@/lib/orders.functions";
import { listDeliveryZones, type DeliveryZone } from "@/lib/zones.functions";
import { track } from "@/lib/analytics";
import {
  Smartphone, Truck, ShoppingBag, CreditCard, Loader2, ShieldCheck,
  MapPin, Check, ChevronLeft, Clock, AlertTriangle,
} from "lucide-react";
import orangeLogo from "@/assets/pay-orange-money.webp.asset.json";
import afriLogo from "@/assets/pay-afrimoney.webp.asset.json";
import cardLogo from "@/assets/pay-visa-mastercard.webp.asset.json";

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email or leave it empty").max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Enter your phone number").max(30),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().min(4, "Add a delivery address").max(300),
  landmark: z.string().trim().max(120).optional(),
  momo: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
});

type PaymentMethod = "cod" | "afrimoney" | "orange_money" | "card";

const METHODS: Array<{
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: typeof Smartphone;
  logo?: string;
}> = [
  { value: "cod", label: "Cash on delivery", hint: "Pay the rider when your drinks arrive", icon: Truck },
  { value: "afrimoney", label: "AfriMoneySL", hint: "Approve the prompt or dial *161#", icon: Smartphone, logo: afriLogo.url },
  { value: "orange_money", label: "OrangeMoneySL", hint: "Approve the prompt or dial #144#", icon: Smartphone, logo: orangeLogo.url },
  { value: "card", label: "VisaCard", hint: "Secure card payment", icon: CreditCard, logo: cardLogo.url },

];

const STEPS = ["Delivery", "Payment", "Review"] as const;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const subtotal = cartTotal(items);
  const [step, setStep] = useState(0);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [outsideZone, setOutsideZone] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", email: "", phone: "", whatsapp: "", address: "",
    landmark: "", momo: "", notes: "",
  });
  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [submitting, setSubmitting] = useState(false);
  const createCheckout = useServerFn(createCheckoutSession);
  const createCod = useServerFn(createCodOrder);
  const loadZones = useServerFn(listDeliveryZones);

  useEffect(() => {
    void (async () => {
      try {
        const r = await loadZones({});
        setZones(r.zones);
        if (r.zones[0]) setZoneId(r.zones[0].id);
      } catch { /* zones stay empty; flat fee applies */ }
    })();
  }, [loadZones]);

  const zone = useMemo(() => zones.find((z) => z.id === zoneId), [zones, zoneId]);
  const verification = useMemo(() => verifyCart(items), [items]);
  const isMomo = method === "afrimoney" || method === "orange_money";
  const deliveryFee = outsideZone ? 0 : zone?.fee_leones ?? 15;
  const discount = subtotal >= 120 ? 10 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const fixCart = () => {
    const { setQty, removeItem } = useCart.getState();
    for (const issue of verification.issues) {
      if (issue.suggestedQty <= 0) removeItem(issue.slug);
      else setQty(issue.slug, issue.suggestedQty);
    }
    toast.success("Cart updated to available quantities.");
  };

  const submit = async () => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); setStep(0); return; }
    if (items.length === 0) { toast.error("Your cart is empty."); return; }
    if (!verification.ok) {
      toast.error(`${verification.issues[0].name}: ${verification.issues[0].message}`);
      return;
    }
    if (outsideZone) { toast.error("Delivery availability needs confirmation for this address."); return; }
    if (isMomo && !parsed.data.momo?.trim()) {
      toast.error("Enter the mobile money number registered to this wallet.");
      setStep(1);
      return;
    }


    setSubmitting(true);
    const itemsPayload = items.map((c) => {
      const d = DRINKS.find((x) => x.slug === c.slug)!;
      return { slug: d.slug, name: d.name, qty: c.qty, price: d.price };
    });

    void track("checkout_started", { method, item_count: itemsPayload.length, total });

    const notes = [
      parsed.data.landmark ? `Landmark: ${parsed.data.landmark}` : "",
      parsed.data.whatsapp ? `WhatsApp: ${parsed.data.whatsapp}` : "",
      parsed.data.notes ?? "",
    ].filter(Boolean).join(" · ");

    const customer = {
      customer_name: parsed.data.customer_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: "Freetown",
      district: zone?.name ?? "Western Area",
      zone_id: zone?.id ?? null,
      notes: notes || null,
    };

    try {
      if (method === "cod") {
        const r = await createCod({ data: { items: itemsPayload, customer } });
        if (!r.ok) { toast.error(r.error); setSubmitting(false); return; }
        clear();
        toast.success("Order confirmed — pay the rider on delivery.");
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
      toast.success(isMomo ? "Approve the payment prompt on your phone." : "Opening secure card payment…");
      window.location.href = r.url;
    } catch (e) {
      console.error(e);
      toast.error("The payment service didn't respond. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  const activeMethod = METHODS.find((m) => m.value === method)!;
  const canContinue = step === 0
    ? form.customer_name.trim().length > 1 && form.phone.trim().length > 5 && form.address.trim().length > 3 && !outsideZone
    : true;

  return (
    <Layout>
      <Helmet>
        <title>Secure checkout — KK Drinks Freetown delivery</title>
        <meta name="description" content="Verified checkout with Cash on delivery, AfriMoneySL, OrangeMoneySL or VisaCard. Freetown zone delivery from 30 minutes." />
      </Helmet>

      <div className="min-h-screen bg-[hsl(var(--paper))] pb-16 pt-24">
        <div className="mx-auto max-w-5xl px-6">
          <Link to="/store" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Continue shopping
          </Link>
          <h1 className="display mb-6 text-4xl md:text-5xl">Checkout</h1>

          {items.length === 0 ? (
            <div className="space-y-4 rounded-2xl border bg-card p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link to="/store"><Button>Browse drinks</Button></Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                {/* Stepper */}
                <ol className="flex items-center gap-2">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex flex-1 items-center gap-2">
                      <button onClick={() => i < step && setStep(i)}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                i < step ? "bg-[hsl(var(--sea))] text-white"
                                  : i === step ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground"}`}>
                        {i < step ? <Check className="h-4 w-4" /> : i + 1}
                      </button>
                      <span className={`text-sm ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
                      {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
                    </li>
                  ))}
                </ol>

                {step === 0 && (
                  <section className="space-y-5 rounded-2xl border bg-card p-6">
                    <h2 className="display text-2xl">Delivery details</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <Input id="name" maxLength={100} value={form.customer_name}
                               onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone number</Label>
                        <Input id="phone" maxLength={30} placeholder="+232 …" value={form.phone}
                               onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="wa">WhatsApp number (recommended)</Label>
                        <Input id="wa" maxLength={30} placeholder="+232 …" value={form.whatsapp}
                               onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (for your receipt)</Label>
                        <Input id="email" type="email" maxLength={255} value={form.email}
                               onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="addr">Delivery address</Label>
                        <Input id="addr" maxLength={300} placeholder="Street and house number" value={form.address}
                               onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="landmark">Landmark</Label>
                        <Input id="landmark" maxLength={120} placeholder="Near…" value={form.landmark}
                               onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Delivery area</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {zones.map((z) => (
                          <button key={z.id} type="button"
                                  onClick={() => { setZoneId(z.id); setOutsideZone(false); }}
                                  className={`rounded-xl border p-3 text-left transition-colors ${
                                    !outsideZone && zoneId === z.id
                                      ? "border-[hsl(var(--sea))] bg-[hsl(var(--sea))]/5"
                                      : "hover:bg-muted/40"}`}>
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                              <MapPin className="h-3.5 w-3.5" /> {z.name}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{z.areas.join(", ")}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />{z.eta_min_minutes}–{z.eta_max_minutes} min
                              </span>
                              <span className="font-semibold">Le {z.fee_leones}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={outsideZone}
                               onChange={(e) => setOutsideZone(e.target.checked)} />
                        My address is outside these Freetown areas
                      </label>
                      {outsideZone && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Delivery availability needs confirmation. Call or WhatsApp us on 073 095 177 and we'll
                            confirm the fee and delivery window before you order.
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="notes">Delivery instructions (optional)</Label>
                      <Textarea id="notes" maxLength={500} rows={2} value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </section>
                )}

                {step === 1 && (
                  <section className="space-y-4 rounded-2xl border bg-card p-6">
                    <h2 className="display text-2xl">Payment method</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {METHODS.map((m) => (
                        <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                                  method === m.value ? "border-[hsl(var(--sea))] bg-[hsl(var(--sea))]/5" : "hover:bg-muted/40"}`}>
                          {m.logo
                            ? <img src={m.logo} alt="" className="h-7 w-12 object-contain" />
                            : <m.icon className="h-6 w-12" />}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{m.label}</div>
                            <p className="text-xs text-muted-foreground">{m.hint}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {isMomo && (
                      <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                        <Label htmlFor="momo">
                          {method === "afrimoney" ? "Afrimoney" : "Orange Money"} number
                        </Label>
                        <Input id="momo" maxLength={30} placeholder="+232 …" value={form.momo}
                               onChange={(e) => setForm({ ...form, momo: e.target.value })} />
                        <p className="text-xs text-muted-foreground">
                          Keep your phone nearby — approve the prompt, or dial{" "}
                          <strong>{method === "afrimoney" ? "*161#" : "#144#"}</strong> if it doesn't appear.
                        </p>
                      </div>
                    )}
                    {method === "cod" && (
                      <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                        Your order will be confirmed straight away and you pay the rider in cash on arrival.
                      </p>
                    )}
                  </section>
                )}

                {step === 2 && (
                  <section className="space-y-4 rounded-2xl border bg-card p-6">
                    <h2 className="display text-2xl">Review your order</h2>
                    {verification.ok ? (
                      <p className="flex items-center gap-2 rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-800">
                        <ShieldCheck className="h-4 w-4" /> Cart verified — all {items.length} item{items.length === 1 ? "" : "s"} are available at the quantities you chose.
                      </p>
                    ) : (
                      <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                        <p className="font-semibold text-destructive">We couldn't verify your cart</p>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {verification.issues.map((i) => (
                            <li key={i.slug}>{i.name} — {i.message}</li>
                          ))}
                        </ul>
                        <Button size="sm" variant="outline" onClick={fixCart}>Fix cart automatically</Button>
                      </div>
                    )}
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Name</dt><dd>{form.customer_name}</dd></div>
                      <div><dt className="text-muted-foreground">Phone</dt><dd>{form.phone}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt>
                        <dd>{form.address}{form.landmark ? ` · ${form.landmark}` : ""}</dd></div>
                      <div><dt className="text-muted-foreground">Zone</dt>
                        <dd>{zone?.name ?? "—"}{zone ? ` · ${zone.eta_min_minutes}–${zone.eta_max_minutes} min` : ""}</dd></div>
                      <div><dt className="text-muted-foreground">Payment</dt><dd>{activeMethod.label}</dd></div>
                    </dl>
                  </section>
                )}


                <div className="flex gap-3">
                  {step > 0 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
                  )}
                  {step < 2 && (
                    <Button disabled={!canContinue} onClick={() => setStep(step + 1)}
                            className="bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                      Continue
                    </Button>
                  )}
                </div>
              </div>

              <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
                <h2 className="display text-2xl">Order summary</h2>
                <div className="space-y-3">
                  {items.map((it) => {
                    const d = DRINKS.find((x) => x.slug === it.slug);
                    if (!d) return null;
                    return (
                      <div key={it.slug} className="flex items-center gap-3 text-sm">
                        <img src={d.image} alt={d.name} className="h-12 w-12 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.volume} · Le {d.price} × {it.qty}</div>
                        </div>
                        <div className="tabular-nums">Le {d.price * it.qty}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1 border-t pt-3 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">Le {subtotal}</span></div>
                  <div className="flex justify-between">
                    <span>Delivery {zone && !outsideZone ? `· ${zone.name}` : ""}</span>
                    <span className="tabular-nums">{outsideZone ? "TBC" : `Le ${deliveryFee}`}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-700"><span>Bulk discount</span><span className="tabular-nums">− Le {discount}</span></div>
                  )}
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>Total (SLE)</span>
                  <span className="display text-xl">Le {total}</span>
                </div>
                {zone && !outsideZone && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Estimated delivery {zone.eta_min_minutes}–{zone.eta_max_minutes} minutes
                  </p>
                )}
                <Button size="lg" onClick={step === 2 ? submit : () => setStep(2)}
                        disabled={submitting || outsideZone || (step === 2 && !verification.ok)}
                        className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>)
                    : step < 2 ? "Review order"
                    : !verification.ok ? "Fix cart to continue"
                    : method === "cod" ? `Place order · Le ${total}`
                    : `Pay Le ${total}`}
                </Button>

                <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Orders are only marked paid once the provider confirms payment.
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
