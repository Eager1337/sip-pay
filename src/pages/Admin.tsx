// /admin — passcode landing page. Users enter the passcode; on success we
// store it in sessionStorage and route them to /admin/orders.
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminPasscode } from "@/lib/admin-gate.functions";
import { toast } from "sonner";
import { Shield, Package, BarChart3 } from "lucide-react";

export default function AdminHome() {
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState(false);
  const verify = useServerFn(verifyAdminPasscode);

  useEffect(() => {
    if (sessionStorage.getItem("kk_admin_pass")) setAuthed(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await verify({ data: { passcode: pass } });
      if (!r.ok) throw new Error("Wrong passcode.");
      sessionStorage.setItem("kk_admin_pass", pass);
      toast.success("Welcome back.");
      navigate("/admin/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const signOut = () => { sessionStorage.removeItem("kk_admin_pass"); setAuthed(false); };

  return (
    <Layout>
      <Helmet><title>Admin — KK Drinks</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-28 pb-20 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-md px-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--wood))] text-[hsl(var(--sun))] mb-3">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="display text-4xl">Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Restricted. Passcode required.</p>
          </div>

          {authed ? (
            <div className="rounded-xl border bg-white p-6 space-y-3">
              <p className="text-sm">You are signed in.</p>
              <div className="grid gap-2">
                <Link to="/admin/orders"><Button className="w-full justify-start"><Package className="mr-2 h-4 w-4" /> Orders dashboard</Button></Link>
                <Link to="/admin/analytics"><Button variant="outline" className="w-full justify-start"><BarChart3 className="mr-2 h-4 w-4" /> Analytics</Button></Link>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-xl border bg-white p-6 space-y-3">
              <label className="text-xs text-muted-foreground">Passcode</label>
              <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                     autoFocus required autoComplete="current-password" />
              <Button type="submit" disabled={busy || !pass} className="w-full">
                {busy ? "Verifying…" : "Enter admin"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
