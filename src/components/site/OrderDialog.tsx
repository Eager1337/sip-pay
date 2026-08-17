import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import { DRINKS, type Drink } from "@/data/drinks";
import { useCart, verifyCart, type CartItem } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import orangeLogo from "@/assets/pay-orange-money.webp.asset.json";
import afriLogo from "@/assets/pay-afrimoney.webp.asset.json";
import cardLogo from "@/assets/pay-visa-mastercard.webp.asset.json";

interface OrderDialogProps {
  initialDrink?: Drink;
  trigger?: React.ReactNode;
}

export const OrderDialog = ({ initialDrink, trigger }: OrderDialogProps) => {
  const navigate = useNavigate();
  const { setQty: setCartQty } = useCart();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(
    initialDrink ? [{ slug: initialDrink.slug, qty: 1 }] : [],
  );

  const setQty = (slug: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((c) => c.slug !== slug);
      const existing = prev.find((c) => c.slug === slug);
      if (existing) return prev.map((c) => (c.slug === slug ? { ...c, qty } : c));
      const drink = DRINKS.find((d) => d.slug === slug);
      void track("add_to_cart", { slug, name: drink?.name, qty });
      return [...prev, { slug, qty }];
    });
  };

  const total = cart.reduce((sum, c) => {
    const d = DRINKS.find((x) => x.slug === c.slug);
    return sum + (d ? d.price * c.qty : 0);
  }, 0);

  const verification = verifyCart(cart);

  const goToCheckout = () => {
    if (cart.length === 0) {
      toast.error("Add at least one drink");
      return;
    }
    if (!verification.ok) {
      toast.error(`${verification.issues[0].name}: ${verification.issues[0].message}`);
      return;
    }
    for (const item of cart) setCartQty(item.slug, item.qty);
    void track("store_form_submit", { item_count: cart.length, total });
    setOpen(false);
    navigate("/checkout");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <button className="btn-brush">Order Now</button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="display text-2xl flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Build your order
          </DialogTitle>
          <DialogDescription>
            Choose your drinks, then continue to the secure verified checkout. Prices in Sierra Leonean Leones (Le).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="eyebrow text-muted-foreground">Drinks</p>
          <div className="space-y-2">
            {DRINKS.map((d) => {
              const item = cart.find((c) => c.slug === d.slug);
              const qty = item?.qty ?? 0;
              const cap = Math.min(d.maxPerOrder, d.stock ?? Number.POSITIVE_INFINITY);
              return (
                <div key={d.slug} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
                  <img src={d.image} alt={d.name} className="h-12 w-12 object-contain" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{d.short}</div>
                    <div className="text-xs text-muted-foreground">{d.volume} · Le {d.price}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(d.slug, qty - 1)}>
                      {qty <= 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" disabled={qty >= cap}
                            onClick={() => setQty(d.slug, qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="display text-xl">Le {total}</span>
          </div>
        </div>

        {cart.length > 0 && !verification.ok && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {verification.issues[0].name} — {verification.issues[0].message}
          </p>
        )}

        <Button size="lg" onClick={goToCheckout} disabled={cart.length === 0}
                className="w-full bg-[hsl(var(--sea))] hover:bg-[hsl(var(--sea))]/90">
          Continue to secure checkout · Le {total}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="flex items-center justify-center gap-3 opacity-80">
          <img src={afriLogo.url} alt="AfriMoneySL" className="h-4 object-contain" />
          <img src={orangeLogo.url} alt="OrangeMoneySL" className="h-4 object-contain" />
          <img src={cardLogo.url} alt="VisaCard" className="h-5 object-contain" />
        </div>
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Cash on delivery, AfriMoneySL, OrangeMoneySL and VisaCard at checkout
        </p>
      </DialogContent>
    </Dialog>
  );
};
