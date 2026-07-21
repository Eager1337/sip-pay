import { Link } from "react-router-dom";
import { Instagram, Facebook, MapPin, Phone, Mail, Bike, Shield } from "lucide-react";

export const Footer = () => (
  <footer className="bg-[hsl(var(--wood))] text-white/80 text-sm">
    <div className="torn-top h-12 bg-[hsl(var(--paper))]" aria-hidden />
    <div className="mx-auto max-w-[1200px] px-6 py-14 grid md:grid-cols-4 gap-10">
      <div className="md:col-span-2 space-y-3">
        <div className="display text-3xl text-[hsl(var(--sun))]">KK Drinks</div>
        <p className="text-white/70 max-w-sm leading-relaxed">
          Bottled with love in Sierra Leone. Refreshment crafted for every moment · from family gatherings to a quiet break.
        </p>
        <div className="flex gap-3 pt-2">
          <a href="#" aria-label="Instagram" className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-[hsl(var(--sun))] hover:text-[hsl(var(--wood))] hover:border-[hsl(var(--sun))] transition"><Instagram className="h-4 w-4" /></a>
          <a href="#" aria-label="Facebook" className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-[hsl(var(--sun))] hover:text-[hsl(var(--wood))] hover:border-[hsl(var(--sun))] transition"><Facebook className="h-4 w-4" /></a>
          <Link to="/delivery" aria-label="Delivery rider portal" title="Delivery rider portal" className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-[hsl(var(--sea))] hover:text-white hover:border-[hsl(var(--sea))] transition"><Bike className="h-4 w-4" /></Link>
        </div>
      </div>

      <div>
        <h4 className="eyebrow text-[hsl(var(--sun))] mb-4">Drinks</h4>
        <ul className="space-y-2">
          <li><Link to="/mango" className="hover:text-white transition">Mango Fruity</Link></li>
          <li><Link to="/mixed-fruit" className="hover:text-white transition">Mixed Fruit</Link></li>
          <li><Link to="/yogurt" className="hover:text-white transition">Pineapple Yogurt</Link></li>
          <li><Link to="/water" className="hover:text-white transition">Pure Water</Link></li>
          <li><Link to="/store" className="hover:text-white transition">All drinks →</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="eyebrow text-[hsl(var(--sun))] mb-4">Contact</h4>
        <ul className="space-y-2 text-white/70">
          <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> KK Company Limited, Waterloo–Masiaka Highway, Kwama Village, Koya Rural District, Sierra Leone</li>
          <li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /> <a href="tel:+232033666888" className="hover:text-white">(+232) 033 666 888</a> · <a href="tel:+232090555999" className="hover:text-white">090 555 999</a></li>
          <li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /> <a href="mailto:kkfood866@gmail.com" className="hover:text-white">kkfood866@gmail.com</a></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 py-5 flex flex-col md:flex-row md:justify-between gap-2 text-xs text-white/60">
        <span>© {new Date().getFullYear()} KK Drinks Sierra Leone. NAFDAC & SLSB approved.</span>
        <div className="flex gap-5 items-center">
          <Link to="/track" className="hover:text-white">Track order</Link>
          <Link to="/delivery" className="hover:text-white inline-flex items-center gap-1"><Bike className="h-3 w-3" /> Rider portal</Link>
          <Link to="/wholesale" className="hover:text-white">Stockists</Link>
          <Link to="/admin" className="hover:text-white inline-flex items-center gap-1 opacity-60 hover:opacity-100"><Shield className="h-3 w-3" /> Admin</Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 pb-5 -mt-2 text-xs text-white/50 text-center md:text-right">
        Crafted &amp; developed by{" "}
        <a
          href="https://github.com/Eager1337?tab=repositories"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[hsl(var(--sun))] hover:text-white font-semibold tracking-wide"
        >
          Eager Beaver
        </a>
      </div>
    </div>
  </footer>
);
