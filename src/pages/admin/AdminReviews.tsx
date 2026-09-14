// /admin/reviews — list all reviews, hide/unhide moderation.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listReviewsAdmin, setReviewHidden } from "@/lib/admin-extras.functions";
import { AdminShell, EmptyRow, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Button } from "@/components/ui/button";
import { Star, EyeOff, Eye } from "lucide-react";
import { getDrink } from "@/data/drinks";

type Resp = Awaited<ReturnType<typeof listReviewsAdmin>>;

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-[hsl(var(--sun))] text-[hsl(var(--sun))]" : "text-muted-foreground/40"}`} />
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const listFn = useServerFn(listReviewsAdmin);
  const hideFn = useServerFn(setReviewHidden);
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await listFn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [listFn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (id: string, hidden: boolean) => {
    setBusy(id);
    try { await hideFn({ data: { passcode, review_id: id, hidden } }); await load(); }
    catch (e) { onError(e); } finally { setBusy(null); }
  };

  if (!passcode) return null;
  const reviews = data?.reviews ?? [];

  return (
    <AdminShell title="Reviews" subtitle="Moderate customer reviews" actions={
      <span className="text-xs text-muted-foreground">{reviews.filter((r) => r.hidden).length} hidden</span>
    }>
      <Helmet><title>Reviews — KK Admin</title><meta name="robots" content="noindex" /></Helmet>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr><th className="p-3">Drink</th><th className="p-3">Rating</th><th className="p-3">Author</th><th className="p-3">Body</th><th className="p-3">Date</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const drink = getDrink(r.drink_slug);
              return (
                <tr key={r.id} className={`border-t align-top ${r.hidden ? "opacity-50" : ""}`}>
                  <td className="p-3 font-medium">{drink?.short ?? r.drink_slug}</td>
                  <td className="p-3"><Stars n={r.rating} /></td>
                  <td className="p-3 text-xs">{r.author_name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[320px]">{r.body ?? "—"}</td>
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Button size="sm" variant={r.hidden ? "outline" : "ghost"} disabled={busy === r.id} onClick={() => void toggle(r.id, !r.hidden)}>
                      {r.hidden ? <><Eye className="mr-1 h-3.5 w-3.5" /> Show</> : <><EyeOff className="mr-1 h-3.5 w-3.5" /> Hide</>}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!reviews.length && <EmptyRow colSpan={6}>No reviews yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
