// /admin/wishlist — most-saved drinks ranking.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { wishlistStatsAdmin } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, StatCard, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { getDrink } from "@/data/drinks";
import { Heart } from "lucide-react";

type Resp = Awaited<ReturnType<typeof wishlistStatsAdmin>>;

export default function AdminWishlist() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(wishlistStatsAdmin);
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;
  const stats = data?.stats ?? [];
  const max = Math.max(1, ...stats.map((s) => s.count));

  return (
    <AdminShell title="Wishlist" subtitle="Most-wished products">
      <Helmet><title>Wishlist — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Total saves" value={data?.total ?? 0} />
        <StatCard label="Drinks wished" value={stats.length} />
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Drink</th><th className="p-3">Saves</th><th className="p-3 w-1/2">Share</th></tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const drink = getDrink(s.slug);
              return (
                <tr key={s.slug} className="border-t align-middle">
                  <td className="p-3 flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-[hsl(var(--berry))]" /> <span className="font-medium">{drink?.name ?? s.slug}</span></td>
                  <td className="p-3 tabular-nums">{s.count}</td>
                  <td className="p-3"><div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-[hsl(var(--berry))]" style={{ width: `${(s.count / max) * 100}%` }} /></div></td>
                </tr>
              );
            })}
            {!stats.length && <EmptyRow colSpan={3}>No wishlist saves yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
