// Public order lookup by phone + partial id — used by /track page.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      phone: z.string().min(6).max(30),
      order_ref: z.string().min(6).max(50), // first 8 chars of uuid or full uuid
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const phoneClean = data.phone.replace(/\s+/g, "");
    const isFullUuid = /^[0-9a-f-]{36}$/i.test(data.order_ref);
    let q = supabase.from("orders").select("id, status, total_leones, created_at, paid_at").eq("phone", phoneClean);
    if (isFullUuid) q = q.eq("id", data.order_ref);
    else q = q.ilike("id", `${data.order_ref.toLowerCase()}%`);
    const { data: rows } = await q.limit(5).order("created_at", { ascending: false });
    return { orders: rows ?? [] };
  });

// List all orders for a phone number — used by the buyer dashboard.
export const listMyOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().min(6).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phoneClean = data.phone.replace(/\s+/g, "");
    const { data: rows } = await (supabaseAdmin.from("orders") as any)
      .select("id, status, total_leones, delivery_fee_leones, discount_leones, items, payment_method, created_at, paid_at, delivered_at, cancelled_at, address, city, district, delivery_code")
      .eq("phone", phoneClean)
      .order("created_at", { ascending: false })
      .limit(50);
    return { orders: (rows ?? []) as MyOrderRow[] };
  });

export type MyOrderRow = {
  id: string;
  status: string;
  total_leones: number;
  delivery_fee_leones: number | null;
  discount_leones: number | null;
  items: Array<{ slug: string; name: string; qty: number; price: number }>;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  address: string;
  city: string | null;
  district: string | null;
  delivery_code: string | null;
};

export const createCodOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    items: z.array(z.object({
      slug: z.string().max(60), name: z.string().max(120),
      qty: z.number().int().min(1).max(500), price: z.number().int().min(1).max(100000),
    })).min(1).max(16),
    customer: z.object({
      customer_name: z.string().min(2).max(100),
      phone: z.string().min(6).max(30),
      address: z.string().min(4).max(300),
      notes: z.string().max(500).optional().nullable(),
    }),
  }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_name: data.customer.customer_name,
        phone: data.customer.phone,
        address: data.customer.address,
        notes: data.customer.notes ?? null,
        items: data.items as never,
        total_leones: total,
        status: "cod_pending",
        payment_method: "cod",
      })
      .select("id")
      .single();
    if (error || !order) return { ok: false as const, error: "Could not place order" };
    return { ok: true as const, order_id: order.id };
  });
