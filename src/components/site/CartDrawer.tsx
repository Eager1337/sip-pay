import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart, cartTotal, cartCount } from "@/lib/cart";
import { DRINKS } from "@/data/drinks";
import { Button } from "@/components/ui/button";

export const CartDrawer = () => {
  const { items, drawerOpen, closeDrawer, setQty, removeItem } = useCart();
  const total = cartTotal(items);
  const count = cartCount(items);

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-[61] h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b p-4">
            <h2 className="display text-xl flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Your Cart
              <span className="text-sm font-normal text-muted-foreground">({count})</span>
            </h2>
            <button onClick={closeDrawer} aria-label="Close cart" className="p-2 -mr-2 hover:opacity-70">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Your cart is empty.</p>
                <Link to="/store" onClick={closeDrawer} className="inline-block text-[hsl(var(--sea))] underline">
                  Browse drinks
                </Link>
              </div>
            ) : (
              items.map((item) => {
                const d = DRINKS.find((x) => x.slug === item.slug);
                if (!d) return null;
                const cap = Math.min(d.maxPerOrder, d.stock ?? Infinity);
                return (
                  <div key={item.slug} className="flex gap-3 rounded-lg border p-3">
                    <img src={d.image} alt={d.name} className="h-16 w-16 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.volume} · Le {d.price}</div>
                      <div className="mt-2 flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7"
                                onClick={() => setQty(item.slug, item.qty - 1)}>
                          {item.qty <= 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7"
                                disabled={item.qty >= cap}
                                onClick={() => setQty(item.slug, item.qty + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        {item.qty >= cap && (
                          <span className="text-[10px] text-muted-foreground ml-1">max</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Le {d.price * item.qty}</div>
                      <button onClick={() => removeItem(item.slug)}
                              className="text-xs text-muted-foreground hover:text-destructive mt-2">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <footer className="border-t p-4 space-y-3 bg-muted/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="display text-xl">Le {total}</span>
              </div>
              <Link to="/checkout" onClick={closeDrawer} className="block">
                <Button size="lg" className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
                  Checkout · Le {total}
                </Button>
              </Link>
              <Link to="/store" onClick={closeDrawer}
                    className="block text-center text-sm text-muted-foreground hover:text-foreground">
                Continue shopping
              </Link>
            </footer>
          )}
        </div>
      </aside>
    </>
  );
};
