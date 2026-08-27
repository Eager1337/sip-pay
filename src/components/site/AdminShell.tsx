// Shared admin shell: passcode guard + sidebar navigation + top bar.
// Uses react-router-dom (the legacy-app BrowserRouter). All admin pages that
// opt into the dashboard chrome wrap their content in <AdminShell>.
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Users, Bike, Wallet, Star,
  Heart, ShoppingBag, Building2, Webhook, History, BarChart3,
  MapPin, Settings, Shield, Menu, X, LogOut, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/riders", label: "Riders", icon: Bike },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/wishlist", label: "Wishlist", icon: Heart },
  { to: "/admin/products", label: "Products", icon: ShoppingBag },
  { to: "/admin/wholesale", label: "Wholesale leads", icon: Building2 },
  { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/admin/audit", label: "Audit log", icon: History },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/zones", label: "Delivery zones", icon: MapPin },
  { to: "/admin/content", label: "Site content", icon: ImageIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

/** Reads the passcode from sessionStorage; redirects to /admin when missing. */
export function useAdminPasscode(): string {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  useEffect(() => {
    const p = sessionStorage.getItem("kk_admin_pass");
    if (!p) { navigate("/admin"); return; }
    setPasscode(p);
  }, [navigate]);
  return passcode;
}

/** Standardised handler for a server-fn rejection: drop session on Forbidden. */
export function useAdminErrorHandler() {
  const navigate = useNavigate();
  return (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Forbidden")) {
      sessionStorage.removeItem("kk_admin_pass");
      toast.error("Session expired. Re-enter the passcode.");
      navigate("/admin");
    } else {
      toast.error(msg);
    }
  };
}

export function AdminShell({ title, subtitle, children, actions }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    sessionStorage.removeItem("kk_admin_pass");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--paper))]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 h-14">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/admin/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--wood))] text-[hsl(var(--sun))]">
              <Shield className="h-4 w-4" />
            </span>
            <span className="display text-lg">KK Admin</span>
          </Link>
          <div className="ml-auto">
            <button onClick={signOut} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className={`${open ? "block" : "hidden"} md:block w-56 shrink-0 border-r bg-white min-h-[calc(100vh-3.5rem)]`}>
          <nav className="p-3 space-y-0.5 sticky top-14">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to} onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-[hsl(var(--wood))] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="display text-3xl">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="display text-2xl mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-white ${className ?? ""}`}>
      {title && <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children?: ReactNode }) {
  return (
    <tr><td colSpan={colSpan} className="p-8 text-center text-sm text-muted-foreground">{children ?? "Nothing here yet."}</td></tr>
  );
}
