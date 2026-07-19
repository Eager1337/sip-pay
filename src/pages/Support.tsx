import { Layout } from "@/components/site/Layout";
import { Search, Mail, Phone, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { toast } from "sonner";

const topics = [
  { title: "Where to buy", body: "Find KK Drinks at shops and supermarkets across Sierra Leone." },
  { title: "Wholesale & distribution", body: "Become a stockist or distributor of the KK family of drinks." },
  { title: "Product safety", body: "All KK products are made under NAFDAC and SLSB approved standards." },
  { title: "Online orders", body: "Online ordering is coming soon. Sign up to be the first to know." },
  { title: "Report an issue", body: "Found a problem with a bottle? Let us know and we'll make it right." },
  { title: "Careers", body: "Join the team building Sierra Leone's favourite drinks brand." },
];

const Support = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error("Please add your name and a message.");
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(`Contact from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`);
    window.location.href = `mailto:kkfood866@gmail.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      toast.success("Opening your email app…");
      setSending(false);
    }, 400);
  };

  return (
    <Layout>
      <Helmet>
        <title>Contact KK Drinks · Support Sierra Leone</title>
        <meta name="description" content="Contact KK Company Limited in Kwama Village, Koya Rural District. Call (+232) 033 666 888 or email kkfood866@gmail.com." />
        <link rel="canonical" href="/support" />
      </Helmet>

      <section className="bg-subtle pt-32 pb-16 text-center px-6">
        <h1 className="display text-5xl md:text-6xl">Contact KK</h1>
        <p className="mt-4 text-xl text-muted-foreground">We'd love to hear from you.</p>
        <div className="mx-auto mt-8 max-w-xl flex items-center bg-background rounded-full px-5 py-3 shadow-sm">
          <Search size={16} className="text-muted-foreground" />
          <input className="bg-transparent outline-none w-full ml-3 text-sm" placeholder="Search for help with KK Drinks" />
        </div>
      </section>

      {/* Contact form + info */}
      <section className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-10">
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 shadow-md space-y-5 border border-border/40">
            <h2 className="display text-3xl">Send us a message</h2>
            <div>
              <label className="eyebrow text-muted-foreground block mb-2">Your name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[hsl(var(--sun))]" placeholder="Full name" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow text-muted-foreground block mb-2">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[hsl(var(--sun))]" placeholder="you@example.com" />
              </div>
              <div>
                <label className="eyebrow text-muted-foreground block mb-2">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[hsl(var(--sun))]" placeholder="+232 …" />
              </div>
            </div>
            <div>
              <label className="eyebrow text-muted-foreground block mb-2">Message</label>
              <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[hsl(var(--sun))]" placeholder="How can we help?" />
            </div>
            <button type="submit" disabled={sending} className="btn-pill bg-[hsl(var(--sun))] text-[hsl(var(--wood))] w-full sm:w-auto disabled:opacity-50">
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-border/40 flex gap-4">
              <MapPin className="text-[hsl(var(--sun))] shrink-0 mt-1" />
              <div>
                <p className="eyebrow text-muted-foreground mb-1">Visit</p>
                <p className="text-base leading-relaxed">KK Company Limited<br />Waterloo–Masiaka Highway<br />Kwama Village, Koya Rural District<br />Sierra Leone</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border/40 flex gap-4">
              <Phone className="text-[hsl(var(--sun))] shrink-0 mt-1" />
              <div>
                <p className="eyebrow text-muted-foreground mb-1">Call</p>
                <p className="text-base leading-relaxed">
                  <a href="tel:+232033666888" className="hover:underline">(+232) 033 666 888</a><br />
                  <a href="tel:+232090555999" className="hover:underline">090 555 999</a>
                </p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border/40 flex gap-4">
              <Mail className="text-[hsl(var(--sun))] shrink-0 mt-1" />
              <div>
                <p className="eyebrow text-muted-foreground mb-1">Email</p>
                <a href="mailto:kkfood866@gmail.com" className="text-base hover:underline">kkfood866@gmail.com</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Map */}
      <section className="px-6 pb-20">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="display text-3xl text-center mb-6">Find us on the map</h2>
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

      {/* Help topics */}
      <section className="bg-subtle py-16 px-6">
        <div className="max-w-[1024px] mx-auto">
          <h2 className="display text-3xl text-center mb-8">Common questions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t) => (
              <article key={t.title} className="bg-card rounded-2xl p-6 min-h-[160px] border border-border/40">
                <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Support;
