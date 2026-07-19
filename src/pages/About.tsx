import { Layout } from "@/components/site/Layout";
import { Helmet } from "react-helmet-async";
import fruity from "@/assets/kk-fruity-four.jpeg";
import ambassador from "@/assets/ambassador.png";


const About = () => (
  <Layout>
    <Helmet>
      <title>Our Story · KK Drinks Sierra Leone</title>
      <meta name="description" content="KK Drinks is a Sierra Leonean beverage company crafting fruity sodas, pineapple yogurt and pure water in Kwama Village, Koya Rural District." />
      <link rel="canonical" href="/about" />
    </Helmet>
    <section className="bg-subtle py-20 text-center px-6">
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">About KK Drinks</p>
      <h1 className="display text-5xl md:text-7xl">Made in Sierra Leone.<br />Loved everywhere.</h1>
      <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground">
        KK is a Sierra Leonean drinks company crafting refreshing soft drinks, yogurt beverages and pure drinking water · at a price everyone can enjoy.
      </p>
    </section>

    <section className="py-20 px-6 max-w-[1100px] mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div className="relative flex items-end justify-center md:justify-start">
        <img
          src={ambassador}
          alt="A KK Drinks fan enjoying Orange Fruity"
          loading="lazy"
          className="ambassador-cutout"
        />
      </div>
      <div>
        <p className="eyebrow text-[hsl(var(--mango))] mb-3">Our Story</p>
        <h2 className="display text-3xl md:text-4xl mb-4">Refreshment for the nation.</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          From a single bottling line to a beloved national brand, KK Drinks was built on one simple idea · quality refreshment, made locally, sold fairly.
          Every bottle is produced with care in Sierra Leone, supporting local jobs and local taste.
        </p>
      </div>
    </section>


    <section className="bg-foreground text-background py-20 px-6">
      <div className="max-w-[1024px] mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1">
          <h2 className="display text-3xl md:text-4xl mb-4">Flavours for every Sierra Leonean.</h2>
          <p className="opacity-80 text-lg leading-relaxed">
            Mango, Orange, Apple, Tamarind, Mixed Fruit, Pineapple Yogurt, and Pure Water · seven products at Le 10 each.
            Whether you're at home, at work, or on the road, there's a KK for you.
          </p>
        </div>
        <img src={fruity} alt="KK fruity range" className="rounded-2xl w-full object-cover max-h-[520px] order-1 md:order-2" />
      </div>
    </section>

    <section className="py-20 px-6 max-w-[1024px] mx-auto text-center">
      <h2 className="display text-3xl md:text-4xl mb-3">Visit us · get in touch.</h2>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
        KK Company Limited<br />
        Waterloo–Masiaka Highway, Kwama Village<br />
        Koya Rural District, Sierra Leone
      </p>
      <p className="mt-4 text-muted-foreground text-lg">
        <a href="tel:+232033666888" className="hover:text-foreground">(+232) 033 666 888</a> · <a href="tel:+232090555999" className="hover:text-foreground">090 555 999</a><br />
        <a href="mailto:kkfood866@gmail.com" className="hover:text-foreground">kkfood866@gmail.com</a>
      </p>
    </section>

    <section className="px-6 pb-20 bg-subtle pt-12">
      <div className="max-w-[1100px] mx-auto">
        <h3 className="display text-2xl md:text-3xl text-center mb-6">Find us on the map</h3>
        <div className="rounded-2xl overflow-hidden shadow-lg border border-border/40 aspect-[16/9]">
          <iframe
            title="KK Company Limited — Kwama Village, Koya Rural District"
            src="https://www.google.com/maps?q=Kwama+Village+Waterloo+Masiaka+Highway+Koya+Rural+District+Sierra+Leone&output=embed"
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
