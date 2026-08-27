// Rider-portal server functions — dashboard summary + earnings ledger.
// Auth via requireSupabaseAuth (Supabase session); rider_id stored on orders
// is the riders row id. rider_payouts.rider_id references the auth user id.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RiderRow = {
  id: string; user_id: string; display_name: string; phone: string;
  vehicle: string | null; active: boolean; created_at: string;
};

export const getRiderDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rider } = await supabaseAdmin
      .from("riders")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!rider) return { registered: false as const };
    const r = rider as RiderRow;
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, status, created_at, total_leones, rider_commission_leones")
      .eq("rider_id", r.id)
      .order("created_at", { ascending: false })
      .limit(300);
    const list = (orders ?? []) as Array<{ status: string; created_at: string; total_leones: number; rider_commission_leones: number | null }>;
    const active = list.filter((o) => ["accepted", "paid", "cod_pending", "out_for_delivery"].includes(o.status)).length;
    const delivered = list.filter((o) => o.status === "delivered").length;
    const earnings = list.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.rider_commission_leones ?? 0), 0);
    const todayStart = new Date(new Date().toDateString()).toISOString();
    const today = list.filter((o) => o.created_at >= todayStart).length;
    return { registered: true as const, rider: r, total: list.length, active, delivered, earnings, today };
  });

export const getMyEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // payouts are keyed by the auth user id (see completeDelivery fix).
    const { data: payouts } = await supabaseAdmin
      .from("rider_payouts")
      .select("id, order_id, amount_leones, status, created_at")
      .eq("rider_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (payouts ?? []) as Array<{ id: string; order_id: string; amount_leones: number; status: string; created_at: string }>;
    const total = rows.reduce((s, p) => s + p.amount_leones, 0);
    const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_leones, 0);
    const owed = rows.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount_leones, 0);
    return { payouts: rows, total, paid, owed };
  });

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  vehicle: z.string().trim().max(60).optional().default(""),
});

export const updateRiderProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("riders")
      .update({ display_name: data.display_name, phone: data.phone, vehicle: data.vehicle, updated_at: new Date().toISOString() } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
