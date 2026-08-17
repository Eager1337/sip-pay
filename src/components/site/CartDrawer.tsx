import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag, Truck, ShieldCheck, AlertTriangle } from "lucide-react";
import { useCart, cartTotal, cartCount, verifyCart } from "@/lib/cart";
import { DRINKS } from "@/data/drinks";
import { Button } from "@/components/ui/button";
import orangeLogo from "@/assets/pay-orange-money.webp.asset.json";
import afriLogo from "@/assets/pay-afrimoney.webp.asset.json";
import cardLogo from "@/assets/pay-visa-mastercard.webp.asset.json";
import vultLogo from "@/assets/pay-vult.webp.asset.json";

const FREE_DELIVERY_FROM = 120;

export const CartDrawer = () => {
  const { items, drawerOpen, closeDrawer, setQty, removeItem } = useCart();
  const total = cartTotal(items);
  const count = cartCount(items);
  const remaining = Math.max(0, FREE_DELIVERY_FROM - total);
  const progress = Math.min(100, (total / FREE_DELIVERY_FROM) * 100);
  const verification = verifyCart(items);

  const fixCart = () => {
    for (const issue of verification.issues) {
      if (issue.suggestedQty <= 0) removeItem(issue.slug);
      else setQty(issue.slug, issue.suggestedQty);
    }
  };


  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
        aria-hidden
      />
      <aside
        className={`fixed top-0 right-0 z-[61] flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="display text-xl">Your cart</h2>
            <p className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
          </div>
          <button onClick={closeDrawer} aria-label="Close cart"
                  className="rounded-full p-2 transition-colors hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length > 0 && (
          <div className="border-b bg-muted/30 px-5 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              {remaining > 0
                ? <span>Add <strong className="text-foreground">Le {remaining}</strong> more for a bulk discount</span>
                : <span className="text-foreground">Bulk discount unlocked</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[hsl(var(--sea))] transition-all duration-500"
                   style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="space-y-3 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link to="/store" onClick={closeDrawer}>
                <Button variant="outline">Browse drinks</Button>
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const d = DRINKS.find((x) => x.slug === item.slug);
              if (!d) return null;
              const cap = Math.min(d.maxPerOrder, d.stock ?? Infinity);
              return (
                <div key={item.slug}
                     className="flex gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-sm">
                  <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                    <img src={d.image} alt={d.name} className="h-16 w-14 object-contain" loading="lazy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.volume} · Le {d.price}</div>
                      </div>
                      <button onClick={() => removeItem(item.slug)} aria-label={`Remove ${d.name}`}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border">
                        <button aria-label="Decrease quantity"
                                className="px-2.5 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                                onClick={() => setQty(item.slug, item.qty - 1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
                        <button aria-label="Increase quantity" disabled={item.qty >= cap}
                                className="px-2.5 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                                onClick={() => setQty(item.slug, item.qty + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">Le {d.price * item.qty}</div>
                    </div>
                    {item.qty >= cap && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Maximum available reached</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <footer className="space-y-3 border-t bg-muted/20 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="display text-xl">Le {total}</span>
            </div>
            <p className="text-xs text-muted-foreground">Delivery fee is calculated by Freetown zone at checkout.</p>

            {verification.ok ? (
              <p className="flex items-center gap-1.5 rounded-lg bg-green-600/10 px-3 py-2 text-xs text-green-800">
                <ShieldCheck className="h-3.5 w-3.5" /> Cart verified — every item is available.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-semibold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Some items need attention
                </p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {verification.issues.map((i) => <li key={i.slug}>{i.name} — {i.message}</li>)}
                </ul>
                <Button size="sm" variant="outline" onClick={fixCart}>Fix cart</Button>
              </div>
            )}

            {verification.ok ? (
              <Link to="/checkout" onClick={closeDrawer} className="block">
                <Button size="lg" className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                  Checkout · Le {total}
                </Button>
              </Link>
            ) : (
              <Button size="lg" disabled className="w-full">Fix cart to checkout</Button>
            )}
            <div className="flex items-center justify-center gap-3 opacity-80">
              <img src={afriLogo.url} alt="AfriMoneySL" className="h-4 object-contain" />
              <img src={orangeLogo.url} alt="OrangeMoneySL" className="h-4 object-contain" />
              <img src={cardLogo.url} alt="VisaCard" className="h-5 object-contain" />
              <img src={vultLogo.url} alt="Vult" className="h-5 object-contain" />
            </div>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Secure payment · Sierra Leonean Leone
            </p>

          </footer>
        )}
      </aside>
    </>
  );
};
