import { Layout } from "@/components/site/Layout";

import { OrderDialog } from "@/components/site/OrderDialog";
import { DRINKS } from "@/data/drinks";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  { name: "Aminata K.", role: "Freetown", text: "KK Mango is my daughter's favourite. Always fresh, always cold from our local shop." },
  { name: "David S.", role: "Bo District", text: "We stock KK Pure Water for the whole office — clean taste, fair price, reliable delivery." },
  { name: "Fatmata B.", role: "Makeni", text: "The Pineapple Yogurt is unlike anything else on the market. A real Sierra Leonean signature." },
];

const Store = () => (
  <Layout>
    <Helmet>
      <title>Our Drinks · KK Drinks Sierra Leone</title>
      <meta name="description" content="Browse all seven KK Drinks flavours — fruity sodas, pineapple yogurt and pure water. Bottled fresh in Sierra Leone. Order yours today, every drink Le 10." />
      <link rel="canonical" href="/store" />
      <meta property="og:title" content="Our Drinks · KK Drinks Sierra Leone" />
      <meta property="og:description" content="Seven distinct flavours of refreshment, made in Freetown. Order online today." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: DRINKS.map((d, i) => ({
          "@type": "Product",
          position: i + 1,
          name: d.name,
          description: d.tagline,
          category: d.category,
          offers: { "@type": "Offer", price: d.price, priceCurrency: "SLL", availability: "https://schema.org/InStock" },
        })),
      })}</script>
    </Helmet>

    {/* HERO */}
    <section className="paper-bg pt-32 pb-12 px-6 text-center">
      <p className="eyebrow text-[hsl(var(--sea))]">All KK Drinks</p>
      <h1 className="display text-5xl md:text-6xl mt-3">Pick your favourite.</h1>
      <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-base">
        Seven distinct flavours. One simple price · <span className="font-semibold text-foreground">Le 10</span> per bottle.
      </p>
    </section>

    {/* PRODUCT GRID · premium 4/2/1 layout */}
    <section className="paper-bg pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-[1280px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-7 items-stretch">
        {DRINKS.map((d, i) => (
          <article
            key={d.slug}
            className="product-card fade-up"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Bottle showcase area */}
            <div className="relative h-[280px] sm:h-[300px] flex items-end justify-center px-6 pt-8 pb-3">
              <div
                aria-hidden
                className="absolute inset-x-6 top-6 bottom-3 rounded-2xl opacity-50 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at center, hsl(${d.accent} / 0.18), transparent 70%)` }}
              />
              <img
                src={d.image}
                alt={d.name}
                loading="lazy"
                className="relative z-10 max-h-[250px] w-auto object-contain drop-shadow-[0_20px_24px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:scale-105"
                style={{ background: "transparent" }}
              />
            </div>

            {/* Details */}
            <div className="px-5 pt-3 pb-2 text-center flex-1 flex flex-col">
              <p className="eyebrow text-[10px] text-[hsl(var(--sea))]">{d.category}</p>
              <h3 className="display text-lg sm:text-xl leading-tight mt-1.5 text-[hsl(var(--wood))]">
                {d.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{d.volume}</p>
              <div className="mt-3 mb-4">
                <span className="display text-2xl text-[hsl(var(--wood))]">Le {d.price}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 mt-auto">
              <OrderDialog
                initialDrink={d}
                trigger={
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--wood))] text-white px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] shadow-md hover:bg-[hsl(var(--sun))] hover:text-[hsl(var(--wood))] hover:shadow-lg transition-all">
                    Add to Cart
                  </button>
                }
              />
              {d.href && (
                <Link
                  to={d.href}
                  className="block text-center mt-2 text-[11px] text-[hsl(var(--sea))] hover:underline font-medium"
                >
                  Learn more →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">✓ Bottled fresh today · ✓ Delivered across Sierra Leone</p>
    </section>


    {/* TRUST / REVIEWS */}
    <section className="bg-[hsl(var(--wood))] text-[hsl(var(--wood-foreground))] py-16 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="eyebrow text-[hsl(var(--sun))]">Loved across Sierra Leone</p>
        <h2 className="display text-4xl md:text-5xl mt-3">4.9 / 5 from 2,400+ families</h2>
        <div className="flex justify-center gap-1 mt-3" aria-label="4.9 out of 5 stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={20} className="fill-[hsl(var(--sun))] text-[hsl(var(--sun))]" />
          ))}
        </div>
        <p className="opacity-80 mt-4 max-w-2xl mx-auto">
          Trusted in homes, shops and offices from Freetown to Kenema. Every bottle is produced in our Freetown facility under strict quality control.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mt-10 text-left">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="flex gap-0.5 mb-3" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} className="fill-[hsl(var(--sun))] text-[hsl(var(--sun))]" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed opacity-95">"{t.text}"</blockquote>
              <figcaption className="mt-4 text-xs opacity-70">
                <span className="font-semibold">{t.name}</span> · {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>

    {/* SEO content */}
    <section className="paper-bg py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm">
        <h2 className="display text-3xl mb-4">Refreshing drinks made in Sierra Leone</h2>
        <p className="text-muted-foreground leading-relaxed">
          KK Drinks is a Sierra Leonean beverage company producing fruity soft drinks, carbonated sodas, pineapple yogurt and purified drinking water from our facility in Freetown. Every bottle is crafted with locally-sourced ingredients and filtered through a multi-stage purification process to deliver a clean, consistent taste.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Whether you're stocking your home, your shop, or your office, our seven flavours — Mango, Orange, Mixed Fruit, Apple Soda, Tamarind Soda, Pineapple Yogurt and Pure Water — give you a complete refreshment range at one simple price. Order online today and get fresh delivery across Sierra Leone.
        </p>
      </div>
    </section>
  </Layout>
);

export default Store;
