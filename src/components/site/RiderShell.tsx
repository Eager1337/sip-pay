// Rider portal shell — Supabase-auth gate (sign in / create account) + sidebar.
// Pages render their content as children; the shell owns auth state and nav.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutDashboard, ClipboardList, Package, Wallet, User, Bike, LogOut } from "lucide-react";

const NAV = [
  { to: "/rider", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rider/queue", label: "Available orders", icon: ClipboardList },
  { to: "/rider/deliveries", label: "My deliveries", icon: Package },
  { to: "/rider/earnings", label: "Earnings", icon: Wallet },
  { to: "/rider/profile", label: "Profile", icon: User },
] as const;

export function RiderShell({ title, subtitle, children, actions }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { emailRedirectTo: `${window.location.origin}/rider` },
        });
        if (error) throw error;
        toast.success("Rider account created. If email confirmation is on, confirm via your inbox — otherwise you're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <Helmet><title>{title} — KK Rider</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--sea))] text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="display text-3xl">Rider portal</h1>
              <p className="text-sm text-muted-foreground">Earn 15% commission on every delivery.</p>
            </div>
          </div>

          {userId === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : userId === null ? (
            <form onSubmit={submit} className="rounded-xl border bg-white p-6 space-y-3 max-w-md">
              <h2 className="display text-xl">{mode === "signup" ? "Create a rider account" : "Rider sign in"}</h2>
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password (min 6)" minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{mode === "signup" ? "Create account" : "Sign in"}</Button>
                <Button type="button" variant="outline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                  {mode === "signup" ? "I already have one" : "Create an account"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">After signing in, complete your rider profile to start accepting orders.</p>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <aside className="md:w-52 shrink-0">
                <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                  {NAV.map(({ to, label, icon: Icon }) => {
                    const active = location.pathname === to;
                    return (
                      <Link key={to} to={to}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                          active ? "bg-[hsl(var(--sea))] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}>
                        <Icon className="h-4 w-4 shrink-0" /> {label}
                      </Link>
                    );
                  })}
                  <button onClick={() => supabase.auth.signOut()}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:mt-2">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </nav>
              </aside>

              <div className="flex-1 min-w-0">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="display text-2xl">{title}</h2>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                  </div>
                  {actions}
                </div>
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export function RiderStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="display text-2xl mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
