// /rider/profile — create / edit rider profile (account details).
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRider, registerRider } from "@/lib/delivery.functions";
import { updateRiderProfile } from "@/lib/rider.functions";
import { RiderShell } from "@/components/site/RiderShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Rider = { id: string; display_name: string; phone: string; vehicle: string | null; active: boolean } | null;

export default function RiderProfile() {
  const getFn = useServerFn(getMyRider);
  const regFn = useServerFn(registerRider);
  const updFn = useServerFn(updateRiderProfile);
  const [rider, setRider] = useState<Rider | undefined>(undefined);
  const [form, setForm] = useState({ display_name: "", phone: "", vehicle: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = (await getFn()) as Rider;
      setRider(r);
      if (r) setForm({ display_name: r.display_name, phone: r.phone, vehicle: r.vehicle ?? "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }, [getFn]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.display_name.trim().length < 2 || form.phone.trim().length < 6) {
      toast.error("Enter your full name and phone."); return;
    }
    setBusy(true);
    try {
      if (rider) await updFn({ data: { display_name: form.display_name.trim(), phone: form.phone.trim(), vehicle: form.vehicle.trim() } });
      else await regFn({ data: { display_name: form.display_name.trim(), phone: form.phone.trim(), vehicle: form.vehicle.trim() } });
      toast.success(rider ? "Profile updated." : "Rider profile created — you can now accept orders.");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <RiderShell title="Profile" subtitle={rider ? "Edit your rider details" : "Register as a rider"}>
      {rider === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={submit} className="rounded-xl border bg-white p-6 space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Full name</label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required minLength={2} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Phone (WhatsApp)</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required minLength={6} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vehicle (optional)</label>
            <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Motorbike, Bicycle…" />
          </div>
          {rider && (
            <p className={`text-xs ${rider.active ? "text-[hsl(var(--leaf))]" : "text-orange-600"}`}>
              {rider.active ? "Account active — you can receive orders." : "Account inactive — an admin must activate you."}
            </p>
          )}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : rider ? "Update profile" : "Register as a rider"}</Button>
        </form>
      )}
    </RiderShell>
  );
}
