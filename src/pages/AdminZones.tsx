// /admin/zones — manage Freetown delivery zones (areas, fee, ETA window).
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { listZonesAdmin, upsertZone, deleteZone, type DeliveryZone } from "@/lib/zones.functions";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Save, RefreshCw, ArrowLeft } from "lucide-react";

type Draft = {
  id: string | null;
  name: string;
  areas: string;
  fee_leones: number;
  eta_min_minutes: number;
  eta_max_minutes: number;
  sort_order: number;
  active: boolean;
};

const toDraft = (z: DeliveryZone): Draft => ({
  id: z.id,
  name: z.name,
  areas: (z.areas ?? []).join(", "),
  fee_leones: z.fee_leones,
  eta_min_minutes: z.eta_min_minutes,
  eta_max_minutes: z.eta_max_minutes,
  sort_order: z.sort_order,
  active: z.active,
});

const emptyDraft = (sort: number): Draft => ({
  id: null,
  name: "",
  areas: "",
  fee_leones: 15,
  eta_min_minutes: 45,
  eta_max_minutes: 90,
  sort_order: sort,
  active: true,
});

export default function AdminZonesPage() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const listFn = useServerFn(listZonesAdmin);
  const saveFn = useServerFn(upsertZone);
  const delFn = useServerFn(deleteZone);

  useEffect(() => {
    const p = sessionStorage.getItem("kk_admin_pass");
    if (!p) { navigate("/admin"); return; }
    setPasscode(p);
  }, [navigate]);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true);
    try {
      const r = await listFn({ data: { passcode } });
      setDrafts((r.zones ?? []).map(toDraft));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Forbidden")) {
        sessionStorage.removeItem("kk_admin_pass");
        toast.error("Session expired. Re-enter the passcode.");
        navigate("/admin");
      } else toast.error(msg);
    } finally { setLoading(false); }
  }, [listFn, passcode, navigate]);

  useEffect(() => { void load(); }, [load]);

  const patch = (i: number, p: Partial<Draft>) =>
    setDrafts((d) => d.map((z, idx) => (idx === i ? { ...z, ...p } : z)));

  const save = async (i: number) => {
    const d = drafts[i];
    if (!d) return;
    const key = d.id ?? `new-${i}`;
    setBusy(key);
    try {
      await saveFn({
        data: {
          passcode,
          id: d.id,
          name: d.name.trim(),
          areas: d.areas.split(",").map((a) => a.trim()).filter(Boolean),
          fee_leones: Number(d.fee_leones) || 0,
          eta_min_minutes: Number(d.eta_min_minutes) || 30,
          eta_max_minutes: Number(d.eta_max_minutes) || 60,
          sort_order: Number(d.sort_order) || 0,
          active: d.active,
        },
      });
      toast.success(`${d.name || "Zone"} saved.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(null); }
  };

  const remove = async (i: number) => {
    const d = drafts[i];
    if (!d) return;
    if (!d.id) { setDrafts((x) => x.filter((_, idx) => idx !== i)); return; }
    if (!window.confirm(`Delete zone "${d.name}"?`)) return;
    setBusy(d.id);
    try {
      await delFn({ data: { passcode, id: d.id } });
      toast.success("Zone deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally { setBusy(null); }
  };

  return (
    <Layout>
      <Helmet><title>Delivery zones — KK Drinks Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="pt-28 pb-20 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Link to="/admin/orders" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to orders
              </Link>
              <h1 className="display text-4xl flex items-center gap-2">
                <MapPin className="h-7 w-7" /> Delivery zones
              </h1>
              <p className="text-sm text-muted-foreground">Areas, fees and ETA windows used by checkout.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setDrafts((d) => [...d, emptyDraft(d.length + 1)])}>
                <Plus className="mr-2 h-4 w-4" /> New zone
              </Button>
            </div>
          </div>

          {drafts.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No zones yet. Add one to enable checkout delivery fees.</p>
          )}

          <div className="space-y-4">
            {drafts.map((d, i) => (
              <div key={d.id ?? `new-${i}`} className="rounded-xl border bg-white p-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Zone name</label>
                    <Input value={d.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Zone 1 — Central Freetown" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Delivery fee (Le)</label>
                    <Input type="number" min={0} value={d.fee_leones}
                           onChange={(e) => patch(i, { fee_leones: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Areas (comma separated)</label>
                  <Textarea rows={2} value={d.areas} onChange={(e) => patch(i, { areas: e.target.value })}
                            placeholder="CBD, Hill Station, Murray Town" />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">ETA min (minutes)</label>
                    <Input type="number" min={5} value={d.eta_min_minutes}
                           onChange={(e) => patch(i, { eta_min_minutes: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">ETA max (minutes)</label>
                    <Input type="number" min={5} value={d.eta_max_minutes}
                           onChange={(e) => patch(i, { eta_max_minutes: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Sort order</label>
                    <Input type="number" min={0} value={d.sort_order}
                           onChange={(e) => patch(i, { sort_order: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={d.active} onCheckedChange={(v) => patch(i, { active: v })} />
                    {d.active ? "Active at checkout" : "Hidden"}
                  </label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => void remove(i)} disabled={busy !== null}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                    <Button size="sm" onClick={() => void save(i)} disabled={busy !== null || d.name.trim().length < 2}>
                      <Save className="mr-2 h-4 w-4" />
                      {busy === (d.id ?? `new-${i}`) ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
