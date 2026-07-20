// Persistent cart store powered by Zustand.
// One line-item per drink slug. Quantities are clamped by maxPerOrder + stock.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DRINKS } from "@/data/drinks";

export type CartItem = { slug: string; qty: number };

type CartState = {
  items: CartItem[];
  drawerOpen: boolean;
  addItem: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

function clampQty(slug: string, requested: number): number {
  const d = DRINKS.find((x) => x.slug === slug);
  if (!d) return 0;
  const cap = Math.min(d.maxPerOrder, d.stock ?? Number.POSITIVE_INFINITY);
  return Math.max(0, Math.min(requested, cap));
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      addItem: (slug, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.slug === slug);
          const nextQty = clampQty(slug, (existing?.qty ?? 0) + qty);
          if (nextQty <= 0) return { items: s.items.filter((i) => i.slug !== slug) };
          if (existing) {
            return { items: s.items.map((i) => (i.slug === slug ? { ...i, qty: nextQty } : i)) };
          }
          return { items: [...s.items, { slug, qty: nextQty }] };
        }),
      setQty: (slug, qty) =>
        set((s) => {
          const clamped = clampQty(slug, qty);
          if (clamped <= 0) return { items: s.items.filter((i) => i.slug !== slug) };
          const existing = s.items.find((i) => i.slug === slug);
          if (existing) {
            return { items: s.items.map((i) => (i.slug === slug ? { ...i, qty: clamped } : i)) };
          }
          return { items: [...s.items, { slug, qty: clamped }] };
        }),
      removeItem: (slug) => set((s) => ({ items: s.items.filter((i) => i.slug !== slug) })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
    }),
    { name: "kk-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => {
    const d = DRINKS.find((x) => x.slug === i.slug);
    return sum + (d ? d.price * i.qty : 0);
  }, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.qty, 0);
}
