import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics } from "@/lib/analytics.functions";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AnalyticsResp = Awaited<ReturnType<typeof getAnalytics>>;

const PRESETS = [
  { label: "24h", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const COLORS: Record<string, string> = {
  page_view: "hsl(var(--sea))",
  add_to_cart: "hsl(var(--mango))",
  checkout_started: "hsl(var(--sun))",
  checkout_completed: "hsl(var(--leaf))",
  store_form_submit: "hsl(var(--berry))",
  wholesale_form_submit: "hsl(var(--mango))",
  chat_open: "hsl(var(--sea))",
};

function isoFromDays(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setSignedIn(!!u);
      if (u) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!r);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const claim = useServerFn(claimFirstAdmin);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = authMode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, {
      email: authForm.email,
      password: authForm.password,
      ...(authMode === "signup" ? { options: { emailRedirectTo: window.location.href } } : {}),
    } as never);
    if (error) toast.error(error.message);
    else toast.success(authMode === "signup" ? "Check your inbox to confirm." : "Signed in.");
  };

  const becomeAdmin = async () => {
    try {
      const r = await claim({});
      if (r.granted) toast.success("You are now the admin.");
      else if (r.alreadyAdmin) toast.success("You are already an admin.");
      setIsAdmin(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="pt-32 pb-20 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!signedIn) {
    return (
      <Layout>
        <Helmet><title>Admin sign in · KK Drinks</title></Helmet>
        <section className="pt-32 pb-20 px-6 max-w-md mx-auto">
          <h1 className="display text-3xl mb-2">Admin sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">Restricted dashboard. Sign in with your admin account.</p>
          <form onSubmit={signIn} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required minLength={6} />
            </div>
            <Button type="submit" className="w-full">{authMode === "signin" ? "Sign in" : "Create account"}</Button>
            <button type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="text-xs text-muted-foreground hover:underline w-full">
              {authMode === "signin" ? "Create an account" : "I already have one"}
            </button>
          </form>
        </section>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <section className="pt-32 pb-20 px-6 max-w-md mx-auto text-center space-y-4">
          <h1 className="display text-3xl">Access required</h1>
          <p className="text-sm text-muted-foreground">
            If no admin exists yet, you can claim the role for this account.
          </p>
          <Button onClick={becomeAdmin}>Claim admin role</Button>
          <button onClick={() => supabase.auth.signOut()} className="block mx-auto text-xs text-muted-foreground hover:underline">
            Sign out
          </button>
        </section>
      </Layout>
    );
  }

  return <Dashboard />;
}

function Dashboard() {
  const fetcher = useServerFn(getAnalytics);
  const [days, setDays] = useState(7);
  const [start, setStart] = useState(isoFromDays(7).slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<"all" | "store" | "wholesale">("all");
  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetcher({
        data: {
          start: new Date(start + "T00:00:00Z").toISOString(),
          end: new Date(end + "T23:59:59Z").toISOString(),
          category,
        },
      });
      setData(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [start, end, category]);

  const setPreset = (d: number) => {
    setDays(d);
    setStart(isoFromDays(d).slice(0, 10));
    setEnd(new Date().toISOString().slice(0, 10));
  };

  const chartMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...Object.values(data.byDay));
  }, [data]);

  return (
    <Layout>
      <Helmet><title>Analytics · KK Drinks Admin</title></Helmet>
      <section className="pt-28 pb-20 px-6 max-w-[1200px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow text-[hsl(var(--sea))]">Admin</p>
            <h1 className="display text-4xl md:text-5xl">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Page views, add-to-cart, chat opens, and form submits.</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted-foreground hover:underline">
            Sign out
          </button>
        </header>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPreset(p.days)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  days === p.days ? "bg-[hsl(var(--wood))] text-white border-[hsl(var(--wood))]" : "border-border hover:bg-secondary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider">From</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider">To</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as "all" | "store" | "wholesale")}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">All events</option>
              <option value="store">Store</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total events" value={data?.total ?? 0} />
          <StatCard label="Unique visitors" value={data?.uniqueSessions ?? 0} />
          <StatCard label="Add to cart" value={data?.summary["add_to_cart"] ?? 0} />
          <StatCard label="Form submits" value={(data?.summary["store_form_submit"] ?? 0) + (data?.summary["wholesale_form_submit"] ?? 0)} />
        </div>

        {/* Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">By event type</h3>
            <ul className="space-y-2">
              {Object.entries(data?.summary ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k] ?? "hsl(var(--muted-foreground))" }} />
                    {k.replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold tabular-nums">{v}</span>
                </li>
              ))}
              {!data?.total && <li className="text-sm text-muted-foreground">No events in this range.</li>}
            </ul>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Activity by day</h3>
            <div className="flex items-end gap-1 h-40">
              {Object.entries(data?.byDay ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-[hsl(var(--mango))] rounded-t-sm transition-all group-hover:bg-[hsl(var(--sun))]"
                    style={{ height: `${(count / chartMax) * 100}%`, minHeight: 2 }}
                    title={`${day}: ${count}`}
                  />
                  <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent events */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <header className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Recent events (latest 500)</h3>
          </header>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">Event</th>
                  <th className="text-left px-4 py-2">Path</th>
                  <th className="text-left px-4 py-2">Session</th>
                  <th className="text-left px-4 py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {(data?.events ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(e.created_at as string).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[e.event_type] ?? "hsl(var(--muted-foreground))" }} />
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{e.path ?? "-"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{(e.session_id ?? "").slice(0, 8)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono truncate max-w-[280px]">{JSON.stringify(e.metadata)}</td>
                  </tr>
                ))}
                {!data?.events.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="display text-3xl mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
