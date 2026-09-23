import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, useAdminPass, handleAdminError } from "./AdminShell";
import { runPaymentChecklist } from "@/lib/admin-tools.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type Result = Awaited<ReturnType<typeof runPaymentChecklist>>;

export default function AdminChecklist() {
  const pass = useAdminPass();
  const navigate = useNavigate();
  const run = useServerFn(runPaymentChecklist);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (simulate: boolean) => {
    setBusy(true);
    try { setRes(await run({ data: { passcode: pass, simulate } })); }
    catch (e) { toast.error(handleAdminError(e, navigate)); }
    finally { setBusy(false); }
  };

  return (
    <AdminShell title="Payment checks">
      <p className="text-sm text-muted-foreground mb-4">
        Checks VisaCard checkout and dial-to-pay (AfriMoneySL / OrangeMoneySL) setup. Keys are never shown — only whether they're saved and in test or live mode.
        The simulation creates a labelled test order, confirms it turns paid with a delivery code, then cancels it. No money moves.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => go(false)} disabled={busy}>{busy ? "Checking…" : "Run checks"}</Button>
        <Button variant="outline" onClick={() => go(true)} disabled={busy}>Run checks + simulate paid order</Button>
      </div>
      {res && (
        <div className="space-y-2">
          {res.checks.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 flex gap-3">
              {c.status === "pass" ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                : c.status === "warn" ? <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0" />
                : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
              <div><p className="font-medium">{c.label}</p><p className="text-sm text-muted-foreground">{c.detail}</p></div>
            </div>
          ))}
          <div className="rounded-xl border bg-card p-4 text-sm space-y-1">
            <p className="font-medium">Real payment test (do this once live)</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Place a small order on the site and choose AfriMoneySL or OrangeMoneySL.</li>
              <li>Dial the code shown (*161# Africell, #144# Orange) and approve the payment.</li>
              <li>The order page should switch to Paid within a minute and show a delivery code.</li>
              <li>Check the Payments page: the callback should show "verified" and "applied".</li>
              <li>For VisaCard, repeat with a card once the live Monime key is saved.</li>
            </ol>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
