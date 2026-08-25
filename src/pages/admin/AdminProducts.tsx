// /admin/products — catalog overview with review aggregates + wishlist counts per drink.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { productStatsAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { DRINKS } from "@/data/drinks";
import { Star, Heart } from "lucide-react";

type Resp = Awaited<ReturnType<typeof productStatsAdmin>>;

export default function AdminProducts() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(productStatsAdmin);
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => DRINKS.map((d) => {
    const agg = data?.reviewAgg[d.slug] ?? { count: 0, sum: 0, hidden: 0 };
    const avg = agg.count ? agg.sum / agg.count : 0;
    const wishes = data?.wishCounts[d.slug] ?? 0;
    return { ...d, reviews: agg.count, hiddenReviews: agg.hidden, avg, wishes };
  }), [data]);

  if (!passcode) return null;

  return (
    <AdminShell title="Products" subtitle={`${DRINKS.length} drinks in the catalogue`}>
      <Helmet><title>Products — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.map((d) => (
          <div key={d.slug} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <img src={d.image} alt={d.name} className="h-12 w-12 object-contain" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{d.short}</p>
                <p className="text-xs text-muted-foreground">{d.category} · {d.volume}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-[hsl(var(--sun))] text-[hsl(var(--sun))]" />
                  {d.avg ? d.avg.toFixed(1) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{d.reviews} reviews</p>
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums">
                  <Heart className="h-3.5 w-3.5 text-[hsl(var(--berry))]" /> {d.wishes}
                </p>
                <p className="text-[10px] text-muted-foreground">wishlist</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="tabular-nums font-medium">Le {d.price.toLocaleString()}</span>
              <span className={d.stock === null ? "text-muted-foreground" : (d.stock as number) < 100 ? "text-orange-600" : "text-[hsl(var(--leaf))]"}>
                {d.stock === null ? "∞ stock" : `${d.stock} in stock`}
              </span>
            </div>
            {d.hiddenReviews > 0 && <p className="mt-1 text-[10px] text-muted-foreground">{d.hiddenReviews} hidden review(s)</p>}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
