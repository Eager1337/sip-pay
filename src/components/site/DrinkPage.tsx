import { Layout } from "@/components/site/Layout";
import { SpinBottle } from "@/components/site/SpinBottle";
import { OrderDialog } from "@/components/site/OrderDialog";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import wood from "@/assets/wood-bg.jpg";
import type { Drink } from "@/data/drinks";

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
            <OrderDialog initialDrink={drink} trigger={<button className="btn-pill bg-[hsl(var(--sun))] text-[hsl(var(--wood))]">Order · Le {drink.price}</button>} />
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
          <OrderDialog initialDrink={drink} trigger={<button className="btn-brush">Order · Le {drink.price}</button>} />
        </div>
      </div>
    </section>
  </Layout>
);
