import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart, cartCount } from "@/lib/cart";

const links = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Our Drinks" },
  { to: "/wholesale", label: "Wholesale" },
  { to: "/about", label: "Our Story" },
  { to: "/support", label: "Contact" },
  { to: "/track", label: "Track" },
  { to: "/account", label: "My Orders" },
];

export const TopNav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const items = useCart((s) => s.items);
  const openDrawer = useCart((s) => s.openDrawer);
  const count = cartCount(items);
  const overHero = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const solid = !overHero || scrolled || open;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        solid
          ? "bg-[hsl(var(--wood))]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] border-b border-white/5"
          : "bg-gradient-to-b from-black/40 to-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 text-[13px] text-white">
        <Link to="/" aria-label="KK Drinks home" className="flex items-center gap-2 group">
          <span className="display text-2xl text-[hsl(var(--sun))] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110">
            KK
          </span>
          <span className="hidden sm:inline text-[10px] tracking-[0.3em] uppercase opacity-80">
            Sierra Leone
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-6 tracking-[0.18em] uppercase text-[11px] font-semibold">
          {links.map((l) => (
            <li key={l.label}>
              <NavLink
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `relative py-1 transition-colors hover:text-[hsl(var(--sun))] ${
                    isActive ? "text-[hsl(var(--sun))]" : "text-white/90"
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={openDrawer}
            aria-label={`Open cart, ${count} items`}
            className="relative flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase bg-[hsl(var(--sun))] text-[hsl(var(--wood))] rounded-full px-4 py-2 shadow-md hover:scale-[1.05] transition-transform"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white p-2 -mr-2"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[hsl(var(--wood))]">
          <ul className="flex flex-col px-6 py-4 gap-1 text-base text-white">
            {links.map((l) => (
              <li key={l.label}>
                <NavLink
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-3 border-b border-white/5 tracking-wider uppercase text-sm ${
                      isActive ? "text-[hsl(var(--sun))]" : "text-white/90"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};
