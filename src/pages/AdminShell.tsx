import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/site/Layout";

export const ADMIN_LINKS = [
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/riders", label: "Rider approvals" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/checklist", label: "Payment checks" },
  { to: "/admin/assistant", label: "AI assistant" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/zones", label: "Zones" },
];

export function useAdminPass() {
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  useEffect(() => {
    const p = sessionStorage.getItem("kk_admin_pass");
    if (!p) navigate("/admin");
    else setPass(p);
  }, [navigate]);
  return pass;
}

export function handleAdminError(e: unknown, navigate: (p: string) => void) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Forbidden")) {
    sessionStorage.removeItem("kk_admin_pass");
    navigate("/admin");
  }
  return msg;
}

export const leones = (n: number | null | undefined) => `Le ${(n ?? 0).toLocaleString()}`;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const loc = useLocation();
  return (
    <Layout>
      <Helmet><title>{title} — KK Drinks Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-28 pb-20 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b">
            <Link to="/admin" className="shrink-0 rounded-full px-3 py-1.5 text-sm border bg-card">Home</Link>
            {ADMIN_LINKS.map((l) => (
              <Link key={l.to} to={l.to}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm border ${loc.pathname === l.to ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <h1 className="display text-3xl sm:text-4xl mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </Layout>
  );
}
