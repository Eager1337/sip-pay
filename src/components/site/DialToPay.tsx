// Dial-to-pay screen shown when Monime issues a payment code instead of a
// hosted checkout page. The customer dials the USSD string on their own
// AfriMoneySL / OrangeMoneySL handset; we poll until Monime confirms.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitManualTransfer } from "@/lib/checkout.functions";
import { Copy, Phone, Smartphone, Loader2, ShieldCheck, Clock } from "lucide-react";

export const KK_AFRIMONEY = "033695803";
export const KK_ORANGE = "073095177";

const WALLETS = [
  { key: "afrimoney" as const, label: "AfriMoneySL", number: KK_AFRIMONEY, ussd: "*161#" },
  { key: "orange_money" as const, label: "OrangeMoneySL", number: KK_ORANGE, ussd: "#144#" },
];

function copy(text: string, what: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`${what} copied`);
}

export function DialToPay({
  orderId,
  ussdCode,
  expiresAt,
  totalLeones,
  manualRef,
  onSubmitted,
}: {
  orderId: string;
  ussdCode: string | null;
  expiresAt?: string | null;
  totalLeones: number;
  manualRef?: string | null;
  onSubmitted?: () => void;
}) {
  const [wallet, setWallet] = useState<"afrimoney" | "orange_money">("afrimoney");
  const [reference, setReference] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const submitFn = useServerFn(submitManualTransfer);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await submitFn({ data: { order_id: orderId, reference, from_number: fromNumber, wallet } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Transfer details received — we'll confirm shortly.");
      setReference("");
      onSubmitted?.();
    } catch {
      toast.error("Could not send your transfer details. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-[hsl(var(--sea))] bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[hsl(var(--sea))]" />
          <h2 className="display text-2xl">Dial this code to pay</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Dial the code below on the phone that owns your mobile money wallet, then approve the
          prompt for <strong className="text-foreground">Le {totalLeones}</strong>. This page updates
          itself the moment payment is confirmed.
        </p>

        {ussdCode ? (
          <div className="rounded-xl bg-[hsl(var(--paper))] border p-5 text-center space-y-3">
            <div className="display text-3xl md:text-4xl tracking-wider break-all">{ussdCode}</div>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={`tel:${encodeURIComponent(ussdCode)}`}>
                <Button className="bg-[hsl(var(--sea))]"><Phone className="mr-2 h-4 w-4" /> Dial now</Button>
              </a>
              <Button variant="outline" onClick={() => copy(ussdCode, "Payment code")}>
                <Copy className="mr-2 h-4 w-4" /> Copy code
              </Button>
            </div>
            {expiresAt && (
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Expires {new Date(expiresAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-[hsl(var(--paper))] p-5 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Generating your payment code…
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {WALLETS.map((w) => (
            <div key={w.key} className="rounded-xl border bg-[hsl(var(--paper))] p-4 space-y-1">
              <div className="text-sm font-semibold">{w.label}</div>
              <div className="text-xs text-muted-foreground">Menu code: <span className="font-mono">{w.ussd}</span></div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-sm">{w.number}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(w.number, `${w.label} number`)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Sending manually? Transfer <strong>Le {totalLeones}</strong> to the KK Drinks wallet above,
          then tell us the reference below so we can match your payment.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[hsl(var(--wood))]" />
          <h3 className="display text-xl">I already sent the money</h3>
        </div>
        {manualRef && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            We received your reference <strong>{manualRef}</strong>. KK Drinks is verifying it now.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Wallet used</Label>
            <div className="flex gap-2">
              {WALLETS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWallet(w.key)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    wallet === w.key ? "border-[hsl(var(--sea))] bg-[hsl(var(--sea))]/10" : "hover:bg-muted"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="from-number">Number you paid from</Label>
            <Input id="from-number" value={fromNumber} onChange={(e) => setFromNumber(e.target.value)} placeholder="076 000 000" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs" htmlFor="txn-ref">Transaction reference from your SMS</Label>
            <Input id="txn-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PP250823.1432.A12345" />
          </div>
        </div>
        <Button onClick={submit} disabled={busy || reference.trim().length < 3 || fromNumber.trim().length < 6}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send transfer details
        </Button>
        <p className="text-xs text-muted-foreground">
          Your order is only marked paid after KK Drinks or Monime confirms the money arrived.
        </p>
      </div>
    </div>
  );
}
