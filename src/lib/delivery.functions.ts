// Rider (delivery) and customer-confirm server functions.
// - Riders sign in with Supabase auth, then register a rider profile.
// - Riders can list pending (paid, unassigned) orders and accept them.
// - Riders mark "out for delivery", post GPS location, and complete delivery
//   by entering the 6-digit delivery code shown to the customer.
// - Customers can confirm receipt themselves from the order page.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RIDER_COMMISSION_PCT = 15;

function genCode6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function ensureDeliveryCode(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("delivery_code, total_leones, rider_commission_pct")
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return;
  if (data.delivery_code) return;
  const pct = data.rider_commission_pct ?? RIDER_COMMISSION_PCT;
  const commission = Math.round(((data.total_leones ?? 0) * Number(pct)) / 100);
  await supabaseAdmin
    .from("orders")
    .update({
      delivery_code: genCode6(),
      rider_commission_pct: pct,
      rider_commission_leones: commission,
    } as never)
    .eq("id", orderId);
}

/* -------------------- Rider registration -------------------- */

const registerSchema = z.object({
  display_name: z.string().min(2).max(80),
  phone: z.string().min(6).max(30),
  vehicle: z.string().max(60).optional().default(""),
});

export const registerRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => registerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("riders")
      .upsert(
        {
          user_id: context.userId,
          display_name: data.display_name,
          phone: data.phone,
          vehicle: data.vehicle ?? "",
          active: true,
        } as never,
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRider = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("riders")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

/* -------------------- Order queue -------------------- */

async function requireRider(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("riders")
    .select("id, active, display_name, phone")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Not registered as a rider yet.");
  if (!data.active) throw new Error("Your rider account is inactive.");
  return { admin: supabaseAdmin, rider: data };
}

export const listAvailableOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireRider(context.userId);
    const { data, error } = await admin
      .from("orders")
      .select("id, customer_name, phone, address, total_leones, items, status, created_at, rider_commission_leones")
      .in("status", ["paid", "cod_pending"])
      .is("rider_id", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, rider } = await requireRider(context.userId);
    const { data, error } = await admin
      .from("orders")
      .select("id, customer_name, phone, address, total_leones, items, status, created_at, delivery_code, out_for_delivery_at, delivered_at, customer_confirmed_at, rider_commission_leones")
      .eq("rider_id", rider.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const acceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, rider } = await requireRider(context.userId);
    // Ensure a delivery code exists for the order before rider handoff.
    await ensureDeliveryCode(data.order_id);
    const { data: row, error } = await admin
      .from("orders")
      .update({ rider_id: rider.id, accepted_at: new Date().toISOString() } as never)
      .eq("id", data.order_id)
      .is("rider_id", null)
      .in("status", ["paid", "cod_pending"])
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Order was already taken.");
    await admin.from("order_events").insert({
      order_id: data.order_id,
      event_type: "rider_accepted",
      note: `Rider ${rider.display_name} accepted`,
      actor: context.userId,
    } as never);
    return { ok: true };
  });

export const markOutForDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, rider } = await requireRider(context.userId);
    const { error } = await admin
      .from("orders")
      .update({ status: "out_for_delivery", out_for_delivery_at: new Date().toISOString() } as never)
      .eq("id", data.order_id)
      .eq("rider_id", rider.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    order_id: z.string().uuid(),
    delivery_code: z.string().min(4).max(12),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, rider } = await requireRider(context.userId);
    const { data: order } = await admin
      .from("orders")
      .select("id, delivery_code, rider_id, rider_commission_leones")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.rider_id !== rider.id) throw new Error("Not your order");
    if (!order.delivery_code || order.delivery_code !== data.delivery_code.trim()) {
      throw new Error("Delivery code doesn't match. Ask the customer for the exact 6-digit code.");
    }
    const now = new Date().toISOString();
    await admin
      .from("orders")
      .update({ status: "delivered", delivered_at: now } as never)
      .eq("id", data.order_id);
    // Queue rider payout
    await admin.from("rider_payouts").insert({
      rider_id: rider.id,
      order_id: order.id,
      amount_leones: order.rider_commission_leones ?? 0,
      status: "pending",
    } as never);
    await admin.from("order_events").insert({
      order_id: order.id,
      event_type: "delivered",
      note: `Delivered by ${rider.display_name}`,
      actor: context.userId,
    } as never);
    return { ok: true };
  });

const locSchema = z.object({
  order_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const postRiderLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => locSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { admin, rider } = await requireRider(context.userId);
    await admin.from("rider_locations").upsert(
      {
        rider_id: rider.id,
        order_id: data.order_id,
        lat: data.lat,
        lng: data.lng,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "order_id" },
    );
    return { ok: true };
  });

/* -------------------- Customer confirm receipt -------------------- */

export const getOrderPublicExtras = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    // Public: only the customer with the uuid can hit this; return delivery
    // code + rider display info + last location.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, delivery_code, rider_id, out_for_delivery_at, customer_confirmed_at")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) return null;
    let rider: { display_name: string; phone: string; vehicle: string | null } | null = null;
    let location: { lat: number; lng: number; updated_at: string } | null = null;
    if (order.rider_id) {
      const [{ data: r }, { data: l }] = await Promise.all([
        supabaseAdmin.from("riders").select("display_name, phone, vehicle").eq("id", order.rider_id).maybeSingle(),
        supabaseAdmin.from("rider_locations").select("lat, lng, updated_at").eq("order_id", order.id).maybeSingle(),
      ]);
      rider = r as typeof rider;
      location = l as typeof location;
    }
    return {
      delivery_code: order.delivery_code,
      rider,
      location,
      out_for_delivery_at: order.out_for_delivery_at,
      customer_confirmed_at: order.customer_confirmed_at,
    };
  });

export const customerConfirmReceipt = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    order_id: z.string().uuid(),
    delivery_code: z.string().min(4).max(12),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, delivery_code, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (!order.delivery_code || order.delivery_code !== data.delivery_code.trim()) {
      throw new Error("Delivery code doesn't match.");
    }
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("orders")
      .update({
        customer_confirmed_at: now,
        status: order.status === "delivered" ? "delivered" : "delivered",
        delivered_at: now,
      } as never)
      .eq("id", order.id);
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "customer_confirmed",
      note: "Customer confirmed receipt via order page",
    } as never);
    return { ok: true };
  });
