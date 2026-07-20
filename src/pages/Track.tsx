import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder } from "@/lib/orders.functions";
import { Search } from "lucide-react";
import { toast } from "sonner";

type Row = { id: string; status: string; total_leones: number; created_at: string; paid_at: string | null };

const TrackPage = () => {
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const trackFn = useServerFn(trackOrder);

  const submit = async () => {
    if (phone.length < 6 || ref.length < 6) { toast.error("Enter phone and order reference"); return; }
    setLoading(true);
    try {
      const r = await trackFn({ data: { phone: phone.trim(), order_ref: ref.trim() } });
      setRows(r.orders as Row[]);
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <Helmet>
        <title>Track your order — KK Drinks</title>
      </Helmet>
      <div className="pt-24 pb-16 min-h-screen bg-[hsl(var(--paper))]">
        <div className="mx-auto max-w-xl px-6 space-y-6">
          <h1 className="display text-4xl">Track your order</h1>
          <p className="text-muted-foreground">Enter your phone number and the first 8 characters of your order reference.</p>
          <div className="rounded-xl border bg-white p-6 space-y-4">
            <div>
              <Label htmlFor="p">Phone</Label>
              <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+232 …" />
            </div>
            <div>
              <Label htmlFor="r">Order reference</Label>
              <Input id="r" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 8a3f9c…" />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full">
              <Search className="mr-2 h-4 w-4" /> {loading ? "Searching…" : "Find my order"}
            </Button>
          </div>

          {rows && (
            <div className="rounded-xl border bg-white p-6 space-y-3">
              <h2 className="display text-xl">Results</h2>
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No matching orders.</p>
              ) : rows.map((o) => (
                <Link key={o.id} to={`/order/${o.id}`}
                      className="flex justify-between items-center py-3 border-b last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded">
                  <div>
                    <div className="font-mono text-sm">#{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">Le {o.total_leones}</div>
                    <div className="text-xs text-muted-foreground">{o.status.replace(/_/g, " ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TrackPage;
