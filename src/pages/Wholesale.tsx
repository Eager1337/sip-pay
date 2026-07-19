import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/site/Layout";
import { SpinBottle } from "@/components/site/SpinBottle";
import { DRINKS } from "@/data/drinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { submitWholesaleLead } from "@/lib/wholesale.functions";
import { track } from "@/lib/analytics";
import {
  Truck,
  Factory,
  Users,
  TrendingUp,
  ShieldCheck,
  Award,
  MapPin,
  Sparkles,
  Gift,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import ambassadorSrc from "@/assets/ambassador.png";

/* -------------------------------- DATA -------------------------------- */

const STATS = [
  { icon: Factory, value: "1.2M+", label: "Bottles produced / month" },
  { icon: Users, value: "2,400+", label: "Loyal families" },
  { icon: Truck, value: "180+", label: "Stockists nationwide" },
  { icon: TrendingUp, value: "+38%", label: "YoY revenue growth" },
];

const GROWTH = [
  { y: "2022", v: 28 },
  { y: "2023", v: 46 },
  { y: "2024", v: 72 },
  { y: "2025", v: 92 },
  { y: "2026", v: 100 },
];

const REGIONS = [
  { name: "Western Area", x: 18, y: 72, stockists: 84 },
  { name: "Northern Province", x: 42, y: 28, stockists: 41 },
  { name: "Eastern Province", x: 78, y: 50, stockists: 28 },
  { name: "Southern Province", x: 50, y: 82, stockists: 27 },
];

const RECIPES = [
  {
    name: "Mango Sunrise",
    base: "KK Mango Fruity",
    note: "Pour KK Mango over crushed ice, add a squeeze of lime and a sprig of mint.",
    accent: "var(--mango)",
    emoji: "🥭",
  },
  {
    name: "Tamarind Spritz",
    base: "KK Tamarind Soda",
    note: "Mix Tamarind Soda with sparkling water, a pinch of salt and chili rim. Bold.",
    accent: "var(--berry)",
    emoji: "🌶️",
  },
  {
    name: "Pineapple Cloud",
    base: "KK Pineapple Yogurt",
    note: "Blend Pineapple Yogurt with ice and banana for a creamy island smoothie.",
    accent: "var(--sun)",
    emoji: "🍍",
  },
  {
    name: "Apple Garden Cooler",
    base: "KK Apple Soda",
    note: "Apple Soda over ice with cucumber slices and basil. Crisp & refreshing.",
    accent: "var(--leaf)",
    emoji: "🍏",
  },
];

const PERKS = [
  { icon: ShieldCheck, title: "NAFDAC & SLSB approved", text: "Every batch tested. Full compliance documentation provided." },
  { icon: Truck, title: "Reliable nationwide delivery", text: "Cold-chain logistics from Freetown to Kenema, weekly schedule." },
  { icon: Award, title: "Bulk margin protection", text: "Tiered pricing keeps your shop margins healthy as you scale." },
];

/* ----------------------------- VALIDATION ----------------------------- */

const stockistSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  business: z.string().trim().min(2, "Enter your business name").max(120),
  city: z.string().trim().min(2, "Enter your city").max(80),
  phone: z.string().trim().min(6, "Phone too short").max(30),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

const clubSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().min(6).max(30),
});

/* ------------------------------ COMPONENT ----------------------------- */

const Wholesale = () => {
  /* Bulk calculator */
  const [slug, setSlug] = useState(DRINKS[0].slug);
  const [cases, setCases] = useState(50);
  const drink = DRINKS.find((d) => d.slug === slug)!;
  const BOTTLES_PER_CASE = 24;
  const totals = useMemo(() => {
    const bottles = cases * BOTTLES_PER_CASE;
    const gross = bottles * drink.price;
    const tier = cases >= 200 ? 0.18 : cases >= 100 ? 0.12 : cases >= 50 ? 0.08 : 0.04;
    const discount = Math.round(gross * tier);
    const net = gross - discount;
    return { bottles, gross, discount, net, tier: Math.round(tier * 100) };
  }, [cases, drink.price]);

  /* Lead form */
  const [lead, setLead] = useState({ name: "", business: "", city: "", phone: "", email: "", notes: "" });
  const sendLead = useServerFn(submitWholesaleLead);
  const [sending, setSending] = useState(false);
  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = stockistSchema.safeParse(lead);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first ?? "Please check the form");
      return;
    }
    setSending(true);
    try {
      await sendLead({
        data: {
          full_name: parsed.data.name,
          business_name: parsed.data.business,
          email: parsed.data.email || `${parsed.data.phone.replace(/\D/g, "")}@noemail.kk`,
          phone: parsed.data.phone,
          region: parsed.data.city,
          estimated_quantity: null,
          message: parsed.data.notes ?? null,
        },
      });
      void track("wholesale_form_submit", { region: parsed.data.city });
      toast.success("Thanks! We'll be in touch within 24h.");
      setLead({ name: "", business: "", city: "", phone: "", email: "", notes: "" });
    } catch (err) {
      console.error(err);
      toast.error("Could not submit. Please try again or call us.");
    } finally {
      setSending(false);
    }
  };

  /* Loyalty */
  const [club, setClub] = useState({ name: "", phone: "" });
  const joinClub = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = clubSchema.safeParse(club);
    if (!parsed.success) {
      toast.error("Please enter your name and phone.");
      return;
    }
    toast.success(`Welcome to KK Club, ${parsed.data.name}! Your referral code: KK-${parsed.data.phone.slice(-4)}`);
    setClub({ name: "", phone: "" });
  };

  return (
    <Layout>
      <Helmet>
        <title>Wholesale & Investors · KK Drinks Sierra Leone</title>
        <meta
          name="description"
          content="Become a KK Drinks stockist or investor. 1.2M+ bottles produced monthly, 180+ stockists, 38% YoY growth. Bulk pricing calculator and partnership form."
        />
        <link rel="canonical" href="/wholesale" />
        <meta property="og:title" content="Wholesale & Investors · KK Drinks Sierra Leone" />
        <meta property="og:description" content="Sierra Leone's fastest-growing beverage brand. Partner with us." />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[hsl(var(--wood))] text-white pt-28 pb-24 px-6">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 20%, hsl(var(--sun)/.4), transparent 60%), radial-gradient(50% 50% at 10% 80%, hsl(var(--mango)/.35), transparent 60%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow text-[hsl(var(--sun))]">Wholesale · Investors · Partners</p>
            <h1 className="display text-5xl md:text-6xl lg:text-7xl mt-3 leading-[1.05]">
              Refresh Sierra Leone.<br />
              <span className="text-[hsl(var(--sun))]">Grow with KK.</span>
            </h1>
            <p className="mt-6 text-white/80 text-lg max-w-xl">
              Sierra Leone's fastest-growing local beverage brand. Whether you run a shop, a restaurant chain, or you're an
              investor looking for a national consumer story — we'd love to partner.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="#stockist" className="btn-brush bg-[hsl(var(--sun))] text-[hsl(var(--wood))] px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] rounded-full hover:scale-105 transition">
                Become a stockist
              </a>
              <a href="#calculator" className="border border-white/30 hover:bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] rounded-full transition">
                Bulk price calculator
              </a>
            </div>
          </div>

          {/* Floating bottle showcase */}
          <div className="relative h-[360px] hidden lg:block">
            {DRINKS.slice(0, 5).map((d, i) => (
              <div
                key={d.slug}
                className="absolute"
                style={{
                  left: `${i * 18}%`,
                  bottom: i % 2 === 0 ? "10%" : "0%",
                  width: "120px",
                  zIndex: 5 - i,
                }}
              >
                <SpinBottle src={d.image} alt={d.name} glow={`hsl(${d.accent})`} speed={i % 2 ? "slow" : "normal"} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-6 bg-[hsl(var(--paper))]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-card rounded-2xl p-6 text-center border border-border/50 shadow-sm hover:shadow-lg transition">
              <Icon className="h-8 w-8 mx-auto text-[hsl(var(--sea))]" />
              <div className="display text-3xl md:text-4xl mt-3">{value}</div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GROWTH CHART */}
      <section className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="eyebrow text-[hsl(var(--sea))]">Indexed revenue · 2022 = 28</p>
            <h2 className="display text-4xl md:text-5xl mt-2">Five years of compound growth.</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              From a single bottling line in Kwama Village to a national brand serving 14 districts. Our average
              year-over-year growth since 2022 is <span className="font-semibold text-foreground">38%</span> — driven by
              local sourcing, fair pricing, and strict quality control.
            </p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-md">
            <svg viewBox="0 0 320 200" className="w-full h-auto">
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--sun))" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="hsl(var(--sun))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((g) => (
                <line key={g} x1="30" x2="310" y1={180 - g * 1.5} y2={180 - g * 1.5} stroke="var(--border)" strokeDasharray="2 3" />
              ))}
              {(() => {
                const pts = GROWTH.map((p, i) => ({ x: 30 + i * 70, y: 180 - p.v * 1.5 }));
                const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                const area = `${path} L${pts[pts.length - 1].x},180 L${pts[0].x},180 Z`;
                return (
                  <>
                    <path d={area} fill="url(#grad)" />
                    <path d={path} stroke="hsl(var(--mango))" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="hsl(var(--mango))" stroke="white" strokeWidth="2" />
                        <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fill="var(--foreground)" fontWeight="600">
                          {GROWTH[i].v}
                        </text>
                        <text x={p.x} y="195" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
                          {GROWTH[i].y}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </section>

      {/* DISTRIBUTION MAP */}
      <section className="py-20 px-6 bg-[hsl(var(--paper))]">
        <div className="max-w-[1100px] mx-auto text-center">
          <p className="eyebrow text-[hsl(var(--sea))]">Distribution network</p>
          <h2 className="display text-4xl md:text-5xl mt-2">Reaching every corner of Sierra Leone.</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            180+ stockists across all four provinces. We're actively expanding into the Northern and Eastern interior — your
            shop could be next.
          </p>
        </div>

        <div className="max-w-[900px] mx-auto mt-10 relative bg-card rounded-3xl p-6 border border-border/50 shadow-md">
          <svg viewBox="0 0 100 100" className="w-full h-auto">
            {/* Stylised SL outline */}
            <path
              d="M10,40 Q15,20 35,15 Q60,12 80,25 Q95,38 90,60 Q85,82 60,90 Q35,92 20,80 Q5,65 10,40 Z"
              fill="hsl(var(--leaf) / 0.18)"
              stroke="hsl(var(--leaf))"
              strokeWidth="0.6"
            />
            {/* Region pulses */}
            {REGIONS.map((r) => (
              <g key={r.name}>
                <circle cx={r.x} cy={r.y} r="4" fill="hsl(var(--mango))" opacity="0.3">
                  <animate attributeName="r" values="3;7;3" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={r.x} cy={r.y} r="1.6" fill="hsl(var(--mango))" />
              </g>
            ))}
          </svg>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {REGIONS.map((r) => (
              <div key={r.name} className="flex items-start gap-2 text-left">
                <MapPin className="h-4 w-4 text-[hsl(var(--mango))] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.stockists} stockists</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BULK CALCULATOR */}
      <section id="calculator" className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow text-[hsl(var(--sea))] flex items-center justify-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Bulk pricing
            </p>
            <h2 className="display text-4xl md:text-5xl mt-2">Calculate your wholesale order.</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Tiered discounts: 4% from 24 cases · 8% from 50 · 12% from 100 · 18% from 200 cases.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 bg-card rounded-3xl p-6 md:p-10 border border-border/50 shadow-lg">
            <div className="space-y-5">
              <div>
                <Label className="text-xs uppercase tracking-wider">Choose drink</Label>
                <select
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-2 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
                >
                  {DRINKS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name} — Le {d.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Number of cases (24 bottles each)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCases(Math.max(1, cases - 10))}>−10</Button>
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={cases}
                    onChange={(e) => setCases(Math.max(1, Math.min(5000, parseInt(e.target.value) || 1)))}
                    className="text-center font-bold"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setCases(Math.min(5000, cases + 10))}>+10</Button>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={Math.min(500, cases)}
                  onChange={(e) => setCases(parseInt(e.target.value))}
                  className="w-full mt-3 accent-[hsl(var(--mango))]"
                />
              </div>
            </div>

            <div className="bg-[hsl(var(--paper))] rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bottles</span><span className="font-semibold">{totals.bottles.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross</span><span className="font-semibold">Le {totals.gross.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-[hsl(var(--leaf))]"><span>Volume discount ({totals.tier}%)</span><span className="font-semibold">− Le {totals.discount.toLocaleString()}</span></div>
              <div className="border-t border-border/60 pt-3 flex justify-between items-end">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Your price</span>
                <span className="display text-3xl">Le {totals.net.toLocaleString()}</span>
              </div>
              <a
                href="#stockist"
                className="block text-center w-full mt-2 bg-[hsl(var(--wood))] text-white rounded-full py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[hsl(var(--mango))] hover:text-[hsl(var(--wood))] transition"
              >
                Request this quote →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="py-16 px-6 bg-[hsl(var(--wood))] text-white">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-3 gap-6">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <Icon className="h-8 w-8 text-[hsl(var(--sun))]" />
              <h3 className="display text-xl mt-3">{title}</h3>
              <p className="text-sm opacity-80 mt-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RECIPES */}
      <section className="py-20 px-6 bg-[hsl(var(--paper))]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow text-[hsl(var(--sea))] flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Recipes & mocktails
            </p>
            <h2 className="display text-4xl md:text-5xl mt-2">Mix it. Love it. Share it.</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Four signature serves your customers will ask for again. Perfect for restaurants, bars and home parties.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {RECIPES.map((r) => (
              <article
                key={r.name}
                className="rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition bg-card"
                style={{ background: `linear-gradient(180deg, hsl(${r.accent} / 0.10), var(--card) 60%)` }}
              >
                <div className="text-4xl">{r.emoji}</div>
                <h3 className="display text-xl mt-3">{r.name}</h3>
                <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--sea))] mt-1">{r.base}</p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{r.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* STOCKIST LEAD FORM + KK CLUB */}
      <section id="stockist" className="py-20 px-6 bg-[hsl(var(--paper))]">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-10 items-center mb-10">
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <img
              src={ambassadorSrc}
              alt="A loyal KK Drinks customer"
              loading="lazy"
              className="ambassador-cutout"
            />
          </div>
          <div className="lg:col-span-7">
            <p className="eyebrow text-[hsl(var(--mango))]">Wholesale partnerships</p>
            <h2 className="display text-4xl md:text-5xl text-[hsl(var(--wood))] mt-3 mb-4">
              Sell what Sierra Leone already loves.
            </h2>
            <p className="text-foreground/70 leading-relaxed text-lg">
              Tens of thousands of bottles sip-tested by everyday Sierra Leoneans every week. Become a stockist
              and let your customers grab the KK they're already asking for — at margins that protect your shop.
            </p>
          </div>
        </div>
        <div className="max-w-[1100px] mx-auto grid lg:grid-cols-5 gap-8">

          {/* Lead form */}
          <div className="lg:col-span-3 bg-card rounded-3xl p-6 md:p-10 border border-border/50 shadow-lg">
            <p className="eyebrow text-[hsl(var(--sea))]">Become a partner</p>
            <h2 className="display text-3xl md:text-4xl mt-2">Stock KK in your shop.</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Tell us about your business — we'll come back within 24 hours with a partnership pack.
            </p>
            <form onSubmit={submitLead} className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <Label>Your name *</Label>
                <Input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} maxLength={100} />
              </div>
              <div className="sm:col-span-1">
                <Label>Business name *</Label>
                <Input value={lead.business} onChange={(e) => setLead({ ...lead, business: e.target.value })} maxLength={120} />
              </div>
              <div className="sm:col-span-1">
                <Label>City / district *</Label>
                <Input value={lead.city} onChange={(e) => setLead({ ...lead, city: e.target.value })} maxLength={80} />
              </div>
              <div className="sm:col-span-1">
                <Label>Phone *</Label>
                <Input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} maxLength={30} />
              </div>
              <div className="sm:col-span-2">
                <Label>Email (optional)</Label>
                <Input type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} maxLength={255} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tell us what you'd like to stock</Label>
                <Textarea
                  value={lead.notes}
                  onChange={(e) => setLead({ ...lead, notes: e.target.value })}
                  maxLength={500}
                  rows={4}
                  placeholder="e.g. 30 cases of Mango, 20 of Pure Water, monthly..."
                />
              </div>
              <Button type="submit" disabled={sending} className="sm:col-span-2 bg-[hsl(var(--mango))] hover:bg-[hsl(var(--sun))] text-[hsl(var(--wood))] font-bold uppercase tracking-[0.2em] text-xs py-6">
                <CheckCircle2 className="mr-2 h-4 w-4" /> {sending ? "Sending…" : "Send partnership request"}
              </Button>
            </form>
          </div>

          {/* KK Club */}
          <aside className="lg:col-span-2 bg-gradient-to-br from-[hsl(var(--mango))] to-[hsl(var(--sun))] text-[hsl(var(--wood))] rounded-3xl p-8 shadow-lg flex flex-col">
            <Gift className="h-10 w-10" />
            <h2 className="display text-3xl mt-3">Join KK Club.</h2>
            <p className="text-sm mt-2 leading-relaxed">
              Free to join. Earn points on every order, get monthly giveaways, and your own referral code that gives friends 10% off.
            </p>
            <form onSubmit={joinClub} className="mt-6 space-y-3 flex-1 flex flex-col">
              <div>
                <Label className="text-[hsl(var(--wood))]">Name</Label>
                <Input value={club.name} onChange={(e) => setClub({ ...club, name: e.target.value })} maxLength={100} className="bg-white/80 border-[hsl(var(--wood))/0.2]" />
              </div>
              <div>
                <Label className="text-[hsl(var(--wood))]">Phone</Label>
                <Input value={club.phone} onChange={(e) => setClub({ ...club, phone: e.target.value })} maxLength={30} className="bg-white/80" />
              </div>
              <Button type="submit" className="mt-auto bg-[hsl(var(--wood))] text-[hsl(var(--sun))] hover:bg-black font-bold uppercase tracking-[0.2em] text-xs py-6">
                Join the club
              </Button>
              <p className="text-[10px] opacity-80 text-center">By joining you agree to receive WhatsApp updates from KK.</p>
            </form>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default Wholesale;
