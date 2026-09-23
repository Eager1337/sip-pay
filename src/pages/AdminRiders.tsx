import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, useAdminPass, handleAdminError, leones } from "./AdminShell";
import { listRiderApplications, setRiderStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Rider = Awaited<ReturnType<typeof listRiderApplications>>[number];
const FILTERS = ["all", "pending", "approved", "rejected", "suspended"];

export default function AdminRiders() {
  const pass = useAdminPass();
  const navigate = useNavigate();
  const list = useServerFn(listRiderApplications);
  const setStatus = useServerFn(setRiderStatus);
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!pass) return;
    setLoading(true);
    try { setRows(await list({ data: { passcode: pass, status: filter } })); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
    finally { setLoading(false); }
  }, [pass, filter, list, navigate]);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "approve" | "reject" | "suspend" | "reactivate") => {
    let reason: string | undefined;
    if (action === "reject" || action === "suspend") {
      reason = window.prompt("Reason (shown to rider)") ?? undefined;
      if (reason === undefined) return;
    }
    try { await setStatus({ data: { passcode: pass, rider_id: id, action, reason } }); toast.success("Rider updated"); void load(); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
  };

  return (
    <AdminShell title="Rider approvals">
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{r.display_name || "Unnamed rider"}</span>
              <Badge variant="outline" className="capitalize">{r.status ?? "pending"}</Badge>
            </div>
            <p className="text-sm">Phone: {r.phone || "—"} · Vehicle: {r.vehicle || "—"}</p>
            <p className="text-sm text-muted-foreground">{r.deliveries} deliveries · {leones(r.earned_leones)} earned · joined {new Date(r.created_at).toLocaleDateString()}</p>
            {r.missing.length > 0
              ? <p className="text-sm text-destructive">Missing: {r.missing.join(", ")}</p>
              : <p className="text-sm text-primary">All required details provided</p>}
            {r.rejection_reason && <p className="text-xs text-muted-foreground">Note: {r.rejection_reason}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {r.status !== "approved" && <Button size="sm" onClick={() => act(r.id, "approve")} disabled={r.missing.length > 0}>Approve</Button>}
              {r.status === "pending" && <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>Reject</Button>}
              {r.status === "approved" && <Button size="sm" variant="outline" onClick={() => act(r.id, "suspend")}>Suspend</Button>}
              {(r.status === "suspended" || r.status === "rejected") && <Button size="sm" variant="outline" onClick={() => act(r.id, "reactivate")}>Reactivate</Button>}
            </div>
          </div>
        ))}
      </div>
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No riders in this list.</p>}
    </AdminShell>
  );
}
