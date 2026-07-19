import { Layout } from "@/components/site/Layout";
import { SpinBottle } from "@/components/site/SpinBottle";
import { OrderDialog } from "@/components/site/OrderDialog";
import { DRINKS, getDrink } from "@/data/drinks";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Truck, Sparkles, Leaf } from "lucide-react";
import wood from "@/assets/wood-bg.jpg";
import lineup from "@/assets/kk-lineup.jpeg";
import lineupTall from "@/assets/kk-lineup-tall.jpeg";
import fruityFour from "@/assets/kk-fruity-four.jpeg";
import heroBanner from "@/assets/hero-banner.png";
import ambassador from "@/assets/ambassador.png";


const Index = () => {
  const heroDrinks = ["mango", "yogurt", "orange"].map(getDrink).filter(Boolean) as ReturnType<typeof getDrink>[] & {};
  const sorten = DRINKS.filter((d) => ["mango", "orange", "mixed-fruit"].includes(d.slug));

  return (
    <Layout>
      {/* HERO · full-width marketing banner */}
      <section className="relative overflow-hidden bg-white">
        <img
          src={heroBanner}
          alt="Taste Sierra Leone in every sip — KK Drinks"
          fetchPriority="high"
          decoding="sync"
          className="block w-full h-auto object-contain object-center"
        />
      </section>

      {/* SPINNING BOTTLES · on dark wood */}
      <section
        className="relative py-16 md:py-20 px-4 sm:px-6 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, hsla(22,35%,8%,0.6), hsla(22,35%,12%,0.78)), url(${wood})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-[1200px]">
          <p className="eyebrow text-center text-[hsl(var(--sun))]">The lineup</p>
          <h2 className="display text-center text-3xl md:text-5xl text-white mt-2 mb-12">Refreshment in motion.</h2>
          <div className="relative grid grid-cols-3 gap-4 sm:gap-8 items-end">
            {heroDrinks.map((d, i) => (
              <div key={d!.slug} className="relative w-full max-w-[260px] mx-auto" style={{ background: "transparent" }}>
                <SpinBottle
                  src={d!.image}
                  alt={d!.name}
                  speed={i === 1 ? "normal" : "slow"}
                  glow={`hsl(${d!.accent})`}
                  priority
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[hsl(var(--paper))] torn-top" aria-hidden />
      </section>


      {/* TRUST BADGES strip */}
      <section className="paper-bg py-10 px-6 border-b border-kraft">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icon: Leaf, t: "Made in Sierra Leone", s: "Locally bottled in Freetown" },
            { Icon: Award, t: "NAFDAC & SLSB", s: "Certified safe & approved" },
            { Icon: Truck, t: "Delivery available", s: "Order & pay on delivery" },
            { Icon: Sparkles, t: "Always Le 10", s: "One price. Every drink." },
          ].map(({ Icon, t, s }) => (
            <div key={t} className="trust-card flex items-start gap-3">
              <Icon className="h-6 w-6 text-[hsl(var(--sea))] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">{t}</div>
                <div className="text-xs text-muted-foreground">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KK ESTD section · Apple-tile style icons */}
      <section className="paper-bg py-20 px-6 text-center">
        <p className="eyebrow text-[hsl(var(--sea))]">KK · Bottled in Sierra Leone</p>
        <h2 className="display text-4xl md:text-5xl mt-3 mb-12">Sip a little sunshine.</h2>
        <div className="mx-auto max-w-[1100px] grid md:grid-cols-3 gap-10">
          <div>
            <div className="mx-auto h-20 mb-4 flex items-center justify-center text-[hsl(var(--sea))]">
              <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 8h6v8h-6zM36 8h6v8h-6zM18 16h28v40a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z"/></svg>
            </div>
            <h3 className="eyebrow mb-2">Discover our flavours</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Take a peek at our full range. Seven distinct drinks · there's a KK for every craving.</p>
          </div>
          <div>
            <div className="mx-auto h-20 mb-4 flex items-center justify-center text-[hsl(var(--sea))]">
              <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M32 6c-9 0-16 7-16 16 0 12 16 30 16 30s16-18 16-30c0-9-7-16-16-16z"/><circle cx="32" cy="22" r="5"/></svg>
            </div>
            <h3 className="eyebrow mb-2">Where to buy KK</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Find KK Drinks at shops, stalls and supermarkets across Sierra Leone.</p>
          </div>
          <div>
            <div className="mx-auto h-20 mb-4 flex items-center justify-center text-[hsl(var(--sea))]">
              <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 16h48v32H8z"/><path d="M8 16l24 18 24-18"/></svg>
            </div>
            <h3 className="eyebrow mb-2">Want to stock KK?</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Restaurants, hotels, kiosks · get in touch and bring KK to your customers.</p>
          </div>
        </div>
        <Link to="/store" className="btn-brush mt-12">The Drinks</Link>
      </section>

      {/* OUR STORY · editorial with brand ambassador cutout */}
      <section className="paper-bg relative py-20 md:py-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="relative flex items-end justify-center md:justify-start">
            <img
              src={ambassador}
              alt="A Sierra Leonean fan enjoying KK Orange Fruity"
              loading="lazy"
              className="ambassador-cutout"
            />
          </div>
          <div>
            <p className="eyebrow text-[hsl(var(--mango))]">Our Story, Our Pride</p>
            <h2 className="display text-4xl md:text-5xl text-[hsl(var(--wood))] mt-3 mb-5">
              Bottled in Freetown.<br />
              <span className="text-[hsl(var(--sea))]">Loved across Sierra Leone.</span>
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4 text-lg">
              KK was born in Sierra Leone with one belief: refreshment should taste like home. From sweet ripe mango to creamy pineapple yogurt, every bottle is filled in our Freetown facility with care.
            </p>
            <p className="text-foreground/70 leading-relaxed">
              We work with local farmers, follow strict quality standards, and keep the price simple · Le 10 a bottle, no matter the flavour.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 mt-6 text-[hsl(var(--sea))] font-semibold hover:gap-3 transition-all">
              Read our story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>




      {/* DIE SORTEN · three featured spinning bottles */}
      <section className="paper-bg py-24 px-6">
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="eyebrow text-[hsl(var(--sea))]">Die Sorten</p>
          <h2 className="display text-4xl md:text-5xl mt-3 mb-14">The flavours.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {sorten.map((d, i) => (
              <div key={d.slug} className="flex flex-col items-center fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-full max-w-[220px] sm:max-w-[240px] h-[320px] sm:h-[360px] flex items-end">
                  <SpinBottle src={d.image} alt={d.name} glow={`hsl(${d.accent})`} speed={i % 2 === 0 ? "normal" : "slow"} />
                </div>
                <h3 className="display text-2xl mt-6">{d.short}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{d.tagline}</p>
                <OrderDialog initialDrink={d} trigger={<button className="btn-brush">Order · Le {d.price}</button>} />
              </div>
            ))}
          </div>
          <Link to="/store" className="inline-flex items-center gap-2 mt-14 font-semibold text-[hsl(var(--sea))] hover:gap-3 transition-all">
            See all 7 drinks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* INSTAGRAM marquee strip */}
      <section className="bg-[hsl(var(--sea))] py-12 overflow-hidden">
        <div className="text-center mb-8 text-white">
          <p className="eyebrow opacity-80">@kkdrinks_sl</p>
          <h2 className="display text-3xl md:text-4xl mt-2">Fresh from our feed.</h2>
        </div>
        <div className="flex marquee-track gap-4 w-max">
          {[lineup, fruityFour, lineupTall, lineup, fruityFour, lineupTall, lineup, fruityFour].concat([lineup, fruityFour, lineupTall, lineup, fruityFour, lineupTall, lineup, fruityFour]).map((src, i) => (
            <div key={i} className="h-44 w-44 md:h-56 md:w-56 shrink-0 rounded-xl overflow-hidden bg-white shadow-lg">
              <img src={src} alt="KK on Instagram" className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="paper-bg py-20 px-6 text-center">
        <h2 className="display text-4xl md:text-6xl">Until your next sip.</h2>
        <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Stock up on KK today. Pay on delivery anywhere in Sierra Leone · every bottle just Le 10.</p>
        <div className="mt-8">
          <OrderDialog trigger={<button className="btn-pill bg-[hsl(var(--wood))] text-white text-base px-8 py-3">Place an order →</button>} />
        </div>
      </section>
    </Layout>
  );
};

export default Index;
