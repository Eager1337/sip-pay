// /rider — rider overview dashboard.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { getRiderDashboard } from "@/lib/rider.functions";
import { RiderShell, RiderStat } from "@/components/site/RiderShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Resp = Awaited<ReturnType<typeof getRiderDashboard>>;

export default function RiderDashboard() {
  const fn = useServerFn(getRiderDashboard);
  const [d, setD] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    try { setD(await fn()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }, [fn]);

  useEffect(() => { void load(); }, [load]);

  return (
    <RiderShell title="Dashboard" subtitle="Your deliveries at a glance">
      {d === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !d.registered ? (
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <p className="text-sm">You're signed in but haven't registered as a rider yet.</p>
          <Link to="/rider/profile"><Button>Complete your rider profile</Button></Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <RiderStat label="Today" value={d.today} hint="Deliveries" />
            <RiderStat label="Active" value={d.active} hint="In progress" />
            <RiderStat label="Delivered" value={d.delivered} />
            <RiderStat label="Earnings" value={`Le ${d.earnings.toLocaleString()}`} hint="From delivered" />
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm">
              Welcome, <span className="font-semibold">{d.rider.display_name}</span>. You've handled{" "}
              <span className="font-semibold">{d.total}</span> order(s) total.{" "}
              {d.rider.active ? (
                <span className="text-[hsl(var(--leaf))]">Your account is active.</span>
              ) : (
                <span className="text-orange-600">Your account is currently inactive — contact an admin.</span>
              )}
            </p>
            <Link to="/rider/queue"><Button className="mt-3">Look for orders</Button></Link>
          </div>
        </>
      )}
    </RiderShell>
  );
}
