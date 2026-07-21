import { Layout } from "@/components/site/Layout";
import { SpinBottle } from "@/components/site/SpinBottle";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Star, Loader2 } from "lucide-react";
import wood from "@/assets/wood-bg.jpg";
import type { Drink } from "@/data/drinks";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listReviews, addReview, toggleWishlist, getWishlist } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AddToCartButton = ({ drink, className }: { drink: Drink; className?: string }) => {
  const addItem = useCart((s) => s.addItem);
  const openDrawer = useCart((s) => s.openDrawer);
  return (
    <button
      className={className ?? "btn-pill bg-[hsl(var(--sun))] text-[hsl(var(--wood))]"}
      onClick={() => { addItem(drink.slug, 1); openDrawer(); toast.success(`${drink.short} added to cart`); }}
    >
      Add to cart · Le {drink.price}
    </button>
  );
};

type Review = { id: string; rating: number; body: string; author_name: string; created_at: string };

function WishlistButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const toggleFn = useServerFn(toggleWishlist);
  const getFn = useServerFn(getWishlist);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        try {
          const items = await getFn();
          setOn((items as { drink_slug: string }[]).some((i) => i.drink_slug === slug));
        } catch { /* ignore */ }
      }
    });
  }, [slug, getFn]);

  const click = async () => {
    if (!signedIn) { toast.info("Sign in on the delivery page to save favourites."); return; }
    try {
      const r = await toggleFn({ data: { drink_slug: slug } });
      setOn(r.on);
      toast.success(r.on ? "Added to wishlist" : "Removed from wishlist");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <button
      onClick={click}
      className={`btn-pill border border-white/30 backdrop-blur inline-flex items-center gap-2 ${on ? "bg-red-500/90 text-white" : "bg-white/10 text-white"}`}
      aria-label="Toggle wishlist"
    >
      <Heart className={`h-4 w-4 ${on ? "fill-current" : ""}`} /> {on ? "Saved" : "Save"}
    </button>
  );
}

function StarRow({ value, onChange, size = 5 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} disabled={!onChange}
                className={`${onChange ? "cursor-pointer" : "cursor-default"}`}>
          <Star className={`h-${size} w-${size} ${n <= value ? "fill-[hsl(var(--sun))] text-[hsl(var(--sun))]" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const listFn = useServerFn(listReviews);
  const addFn = useServerFn(addReview);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listFn({ data: { drink_slug: slug } });
      setReviews(r as Review[]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addFn({ data: { drink_slug: slug, rating, body: body.trim(), author_name: name.trim() || "Customer" } });
      toast.success("Thanks for your review!");
      setBody(""); setName(""); setRating(5);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <section className="paper-bg py-20 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="display text-3xl md:text-4xl">Customer reviews</h2>
          <div className="flex items-center gap-2 text-sm">
            <StarRow value={Math.round(avg)} />
            <span className="tabular-nums">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Be the first to review this drink.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{r.author_name}</span>
                  <StarRow value={r.rating} />
                </div>
                <p className="text-sm text-foreground/80">{r.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}

        {signedIn ? (
          <form onSubmit={submit} className="mt-10 rounded-xl border bg-white p-5 space-y-3">
            <h3 className="display text-xl">Leave a review</h3>
            <div>
              <label className="text-xs text-muted-foreground">Your rating</label>
              <StarRow value={rating} onChange={setRating} />
            </div>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <Textarea placeholder="What did you think?" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} required minLength={3} />
            <Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post review"}</Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground mt-10">
            <Link to="/delivery" className="underline">Sign in</Link> to leave a review.
          </p>
        )}
      </div>
    </section>
  );
}

interface DrinkPageProps {
  drink: Drink;
  description: string;
  highlight: { title: string; body: string };
  specs: { k: string; v: string }[];
}

export const DrinkPage = ({ drink, description, highlight, specs }: DrinkPageProps) => (
  <Layout>
    <Helmet>
      <title>{`${drink.name} · ${drink.tagline} | KK Drinks Sierra Leone`}</title>
      <meta name="description" content={`${drink.name} — ${description} ${drink.volume}, Le ${drink.price}. Order online today.`} />
      <link rel="canonical" href={drink.href || `/${drink.slug}`} />
      <meta property="og:type" content="product" />
      <meta property="og:title" content={`${drink.name} · KK Drinks Sierra Leone`} />
      <meta property="og:description" content={`${drink.tagline} ${drink.volume} · Le ${drink.price}. Bottled fresh in Sierra Leone.`} />
      <meta property="og:image" content={drink.image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${drink.name} · KK Drinks`} />
      <meta name="twitter:description" content={drink.tagline} />
      <meta name="twitter:image" content={drink.image} />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: drink.name,
        description: description,
        category: drink.category,
        image: drink.image,
        brand: { "@type": "Brand", name: "KK Drinks" },
        offers: {
          "@type": "Offer",
          price: drink.price,
          priceCurrency: "SLL",
          availability: "https://schema.org/InStock",
          url: drink.href || `/${drink.slug}`,
        },
      })}</script>
    </Helmet>
    {/* Hero */}
    <section
      className="relative -mt-16 pt-32 pb-20 px-6 overflow-hidden"
      style={{ backgroundImage: `linear-gradient(180deg, hsla(22,35%,8%,0.55), hsla(22,35%,12%,0.75)), url(${wood})`, backgroundSize: "cover" }}
    >
      <div className="mx-auto max-w-[1200px] grid md:grid-cols-2 gap-10 items-center text-white">
        <div className="fade-up">
          <p className="eyebrow text-[hsl(var(--sun))]">{drink.category} · {drink.volume}</p>
          <h1 className="display text-5xl md:text-7xl mt-4 mb-4">{drink.name}</h1>
          <p className="text-xl md:text-2xl text-white/80 italic">{drink.tagline}</p>
          <div className="flex flex-wrap gap-3 mt-7 items-center">
            <AddToCartButton drink={drink} />
            <WishlistButton slug={drink.slug} />
            <Link to="/store" className="btn-pill bg-white/10 text-white border border-white/20 backdrop-blur">All drinks</Link>
          </div>
        </div>
        <div className="h-[300px] sm:h-[380px] md:h-[440px] flex items-center justify-center fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="w-[55%] sm:w-[50%] max-w-[240px]">
            <SpinBottle src={drink.image} alt={drink.name} glow={`hsl(${drink.accent})`} priority />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-[hsl(var(--paper))] torn-top" aria-hidden />
    </section>

    {/* Highlight */}
    <section className="paper-bg py-24 px-6 text-center">
      <h2 className="display text-4xl md:text-5xl max-w-3xl mx-auto">{highlight.title}</h2>
      <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{highlight.body}</p>
    </section>

    {/* Made in SL */}
    <section className="bg-[hsl(var(--wood))] text-white py-20 px-6 text-center">
      <p className="eyebrow text-[hsl(var(--sun))] opacity-90">Made in Sierra Leone</p>
      <h2 className="display text-4xl md:text-5xl mt-3 mb-5">Crafted with care.</h2>
      <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">{description}</p>
    </section>

    {/* Specs */}
    <section className="paper-bg py-20 px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="display text-3xl md:text-4xl text-center mb-10">Product details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-12 gap-y-3">
          {specs.map((s) => (
            <div key={s.k} className="flex justify-between border-b border-kraft py-3 text-sm">
              <dt className="font-semibold">{s.k}</dt>
              <dd className="text-muted-foreground text-right">{s.v}</dd>
            </div>
          ))}
        </dl>
        <div className="text-center mt-12">
          <AddToCartButton drink={drink} className="btn-brush" />
        </div>
      </div>
    </section>

    {/* Reviews */}
    <ReviewsSection slug={drink.slug} />
  </Layout>
);
