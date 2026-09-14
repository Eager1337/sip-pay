// /rider/signup — dedicated sign-up / onboarding flow for new riders.
// Step 1: create a rider account (Supabase auth) — or sign in if you already
// have one. Step 2: register the rider profile. Step 3: success → dashboard.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { registerRider, getMyRider } from "@/lib/delivery.functions";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bike, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

type Rider = { id: string; display_name: string; phone: string; vehicle: string | null; active: boolean } | null;

export default function RiderSignup() {
  const navigate = useNavigate();
  const regFn = useServerFn(registerRider);
  const getFn = useServerFn(getMyRider);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [rider, setRider] = useState<Rider | undefined>(undefined);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [auth, setAuth] = useState({ email: "", password: "" });
  const [profile, setProfile] = useState({ display_name: "", phone: "", vehicle: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) { setRider(undefined); return; }
    void (async () => {
      try {
        const r = (await getFn()) as Rider;
        setRider(r);
        if (r) setProfile({ display_name: r.display_name, phone: r.phone, vehicle: r.vehicle ?? "" });
      } catch { setRider(null); }
    })();
  }, [userId, getFn]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: auth.email,
          password: auth.password,
          options: { emailRedirectTo: `${window.location.origin}/rider/signup` },
        });
        if (error) throw error;
        toast.success("Account created. If email confirmation is required, confirm via your inbox — otherwise you're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: auth.email, password: auth.password });
        if (error) throw error;
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.display_name.trim().length < 2 || profile.phone.trim().length < 6) {
      toast.error("Enter your full name and phone."); return;
    }
    setBusy(true);
    try {
      await regFn({ data: { display_name: profile.display_name.trim(), phone: profile.phone.trim(), vehicle: profile.vehicle.trim() } });
      toast.success("Welcome aboard! Your rider profile is set.");
      setRider((await getFn()) as Rider);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Layout>
      <Helmet><title>Become a KK Rider</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-md px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--sea))] text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="display text-3xl">Become a rider</h1>
              <p className="text-sm text-muted-foreground">Earn 15% commission per delivery.</p>
            </div>
          </div>

          {userId === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !userId ? (
            <form onSubmit={submitAuth} className="rounded-xl border bg-white p-6 space-y-3">
              <h2 className="display text-xl">{mode === "signup" ? "Step 1 — Create your account" : "Sign in"}</h2>
              <Input type="email" placeholder="Email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} required />
              <Input type="password" placeholder="Password (min 6 characters)" minLength={6} value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} required />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…</> : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-sm text-[hsl(var(--sea))] hover:underline">
                {mode === "signup" ? "I already have an account" : "Create a new account instead"}
              </button>
            </form>
          ) : rider === undefined ? (
            <p className="text-sm text-muted-foreground">Loading your profile…</p>
          ) : rider ? (
            <div className="rounded-xl border bg-white p-6 space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[hsl(var(--leaf))]" />
              <h2 className="display text-xl">You're all set, {rider.display_name.split(" ")[0]}!</h2>
              <p className="text-sm text-muted-foreground">
                Your rider account is <span className="font-semibold">{rider.active ? "active" : "pending activation by an admin"}</span>.
                Phone: {rider.phone}{rider.vehicle ? ` · ${rider.vehicle}` : ""}.
              </p>
              <Button onClick={() => navigate("/rider")}>Go to your dashboard <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
          ) : (
            <form onSubmit={submitProfile} className="rounded-xl border bg-white p-6 space-y-3">
              <h2 className="display text-xl">Step 2 — Complete your rider profile</h2>
              <Input placeholder="Full name" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} required minLength={2} />
              <Input placeholder="Phone (WhatsApp)" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} required minLength={6} />
              <Input placeholder="Vehicle (e.g. Motorbike, Bicycle)" value={profile.vehicle} onChange={(e) => setProfile({ ...profile, vehicle: e.target.value })} />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Register as a rider"}
              </Button>
              <p className="text-xs text-muted-foreground">Already a rider? <Link to="/rider" className="text-[hsl(var(--sea))] hover:underline">Go to dashboard</Link></p>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
