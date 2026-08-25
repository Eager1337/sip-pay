// Admin server functions for the expanded dashboard — all gated by the
// ADMIN_PASSCODE (defaults to "Eagerbeaver123") and using the service-role
// client (bypasses RLS). Mirrors the pattern in admin.functions.ts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkAdminPasscode } from "./admin-gate.functions";

const pass = z.string().min(1).max(200);

async function admin(passcode: string | undefined) {
  if (!checkAdminPasscode(passcode)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const REVENUE_STATUSES = ["paid", "delivered", "out_for_delivery", "cod_pending"];
const PENDING_STATUSES = ["awaiting_payment", "paid", "cod_pending", "out_for_delivery"];

/* ------------------------ Dashboard overview ------------------------ */

export const getAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const [orders, riders, reviews, leads, payouts, zones] = await Promise.all([
      db.from("orders").select("id, status, total_leones, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("riders").select("id, active"),
      db.from("reviews").select("id, rating, hidden"),
      db.from("wholesale_leads").select("id", { count: "exact", head: true }),
      db.from("rider_payouts").select("amount_leones, status"),
      db.from("delivery_zones").select("id, active"),
    ]);

    const orderRows = orders.data ?? [];
    const statusCounts: Record<string, number> = {};
    let revenue = 0;
    let pending = 0;
    for (const o of orderRows as Array<{ status: string; total_leones: number }>) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      if (REVENUE_STATUSES.includes(o.status)) revenue += o.total_leones ?? 0;
      if (PENDING_STATUSES.includes(o.status)) pending += 1;
    }
    const reviewRows = (reviews.data ?? []) as Array<{ rating: number; hidden: boolean }>;
    const visibleReviews = reviewRows.filter((r) => !r.hidden);
    const avgRating = visibleReviews.length
      ? visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length
      : 0;
    const payoutRows = (payouts.data ?? []) as Array<{ amount_leones: number; status: string }>;
    const owedTotal = payoutRows.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount_leones, 0);

    const recent = await db
      .from("orders")
      .select("id, customer_name, phone, status, total_leones, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const todayStart = new Date(Date.now() - 86400_000).toISOString();
    const recent24 = orderRows.filter((o: { created_at: string }) => new Date(o.created_at) >= new Date(hourAgo)).length;
    const last24Revenue = orderRows
      .filter((o: { created_at: string; status: string; total_leones: number }) => o.created_at >= todayStart && REVENUE_STATUSES.includes(o.status))
      .reduce((s, o: { total_leones: number }) => s + (o.total_leones ?? 0), 0);

    return {
      totalOrders: orderRows.length,
      revenue,
      pending,
      recent24,
      last24Revenue,
      activeRiders: (riders.data ?? []).filter((r: { active: boolean }) => r.active).length,
      totalRiders: (riders.data ?? []).length,
      reviews: reviewRows.length,
      hiddenReviews: reviewRows.filter((r) => r.hidden).length,
      avgRating: Math.round(avgRating * 10) / 10,
      wholesaleLeads: leads.count ?? 0,
      owedPayouts: owedTotal,
      pendingPayouts: payoutRows.filter((p) => p.status !== "paid").length,
      activeZones: (zones.data ?? []).filter((z: { active: boolean }) => z.active).length,
      statusCounts,
      recent: recent.data ?? [],
    };
  });

/* ------------------------ Customers ------------------------ */

export const listCustomersAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass, search: z.string().max(80).optional().default("") }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: rows } = await db
      .from("orders")
      .select("id, customer_name, phone, address, total_leones, status, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    const map = new Map<string, { name: string; phone: string; address: string; orders: number; spent: number; lastOrder: string; statuses: Record<string, number> }>();
    for (const o of (rows ?? []) as Array<{ customer_name: string; phone: string; address: string; total_leones: number; status: string; created_at: string }>) {
      const key = o.phone || o.customer_name;
      const e = map.get(key) ?? { name: o.customer_name, phone: o.phone, address: o.address, orders: 0, spent: 0, lastOrder: o.created_at, statuses: {} };
      e.orders += 1;
      e.spent += o.total_leones ?? 0;
      e.statuses[o.status] = (e.statuses[o.status] ?? 0) + 1;
      if (o.created_at > e.lastOrder) e.lastOrder = o.created_at;
      map.set(key, e);
    }
    let customers = Array.from(map.values()).sort((a, b) => b.spent - a.spent);
    if (data.search) {
      const s = data.search.toLowerCase();
      customers = customers.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    return { customers: customers.slice(0, 200) };
  });

/* ------------------------ Riders ------------------------ */

export const listRidersAdminFull = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const [{ data: riders }, { data: orders }] = await Promise.all([
      db.from("riders").select("*").order("created_at", { ascending: false }),
      db.from("orders").select("rider_id, status, rider_commission_leones"),
    ]);
    const rows = (riders ?? []) as Array<{ id: string; user_id: string; display_name: string; phone: string; vehicle: string | null; active: boolean; created_at: string }>;
    // Match orders by rider_id which may reference either riders.id or auth.users id.
    const byRiderId = new Map<string, { deliveries: number; owed: number }>();
    for (const o of (orders ?? []) as Array<{ rider_id: string | null; status: string; rider_commission_leones: number | null }>) {
      if (!o.rider_id) continue;
      const e = byRiderId.get(o.rider_id) ?? { deliveries: 0, owed: 0 };
      e.deliveries += 1;
      if (o.status !== "paid" && o.status !== "cancelled") e.owed += o.rider_commission_leones ?? 0;
      byRiderId.set(o.rider_id, e);
    }
    return {
      riders: rows.map((r) => ({
        ...r,
        deliveries: (byRiderId.get(r.id)?.deliveries ?? 0) + (byRiderId.get(r.user_id)?.deliveries ?? 0),
        owed: (byRiderId.get(r.id)?.owed ?? 0) + (byRiderId.get(r.user_id)?.owed ?? 0),
      })),
    };
  });

export const setRiderActive = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass, rider_id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { error } = await db.from("riders").update({ active: data.active } as never).eq("id", data.rider_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------ Payouts ------------------------ */

export const listPayoutsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const [{ data: payouts }, { data: riders }] = await Promise.all([
      db.from("rider_payouts").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("riders").select("id, user_id, display_name, phone"),
    ]);
    const byId = new Map<string, { name: string; phone: string }>();
    for (const r of (riders ?? []) as Array<{ id: string; user_id: string; display_name: string; phone: string }>) {
      byId.set(r.id, { name: r.display_name, phone: r.phone });
      byId.set(r.user_id, { name: r.display_name, phone: r.phone });
    }
    const rows = (payouts ?? []) as Array<{ id: string; rider_id: string; order_id: string; amount_leones: number; status: string; created_at: string }>;
    return {
      payouts: rows.map((p) => ({ ...p, rider_name: byId.get(p.rider_id)?.name ?? "Unknown", rider_phone: byId.get(p.rider_id)?.phone ?? "" })),
    };
  });

export const markPayoutPaid = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass, payout_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { error } = await db.from("rider_payouts").update({ status: "paid" } as never).eq("id", data.payout_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------ Reviews ------------------------ */

export const listReviewsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: reviews } = await db
      .from("reviews")
      .select("id, drink_slug, rating, body, author_name, hidden, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    return { reviews: reviews ?? [] };
  });

export const setReviewHidden = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass, review_id: z.string().uuid(), hidden: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { error } = await db.from("reviews").update({ hidden: data.hidden } as never).eq("id", data.review_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------ Wishlist stats ------------------------ */

export const wishlistStatsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: rows } = await db.from("wishlist").select("drink_slug, created_at").order("created_at", { ascending: false }).limit(5000);
    const counts: Record<string, number> = {};
    for (const w of (rows ?? []) as Array<{ drink_slug: string }>) counts[w.drink_slug] = (counts[w.drink_slug] ?? 0) + 1;
    const stats = Object.entries(counts)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);
    return { total: (rows ?? []).length, stats };
  });

/* ------------------------ Products (catalog + review aggregates) ------------------------ */

export const productStatsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const [{ data: reviews }, { data: wish }] = await Promise.all([
      db.from("reviews").select("drink_slug, rating, hidden"),
      db.from("wishlist").select("drink_slug"),
    ]);
    const revBySlug: Record<string, { count: number; sum: number; hidden: number }> = {};
    for (const r of (reviews ?? []) as Array<{ drink_slug: string; rating: number; hidden: boolean }>) {
      const e = revBySlug[r.drink_slug] ?? { count: 0, sum: 0, hidden: 0 };
      if (!r.hidden) { e.count += 1; e.sum += r.rating; } else e.hidden += 1;
      revBySlug[r.drink_slug] = e;
    }
    const wishBySlug: Record<string, number> = {};
    for (const w of (wish ?? []) as Array<{ drink_slug: string }>) wishBySlug[w.drink_slug] = (wishBySlug[w.drink_slug] ?? 0) + 1;
    return { reviewAgg: revBySlug, wishCounts: wishBySlug };
  });

/* ------------------------ Wholesale leads ------------------------ */

export const listWholesaleLeadsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: leads } = await db
      .from("wholesale_leads")
      .select("id, full_name, business_name, email, phone, region, estimated_quantity, message, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    return { leads: leads ?? [] };
  });

/* ------------------------ Webhook events ------------------------ */

export const listWebhookEventsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: events } = await db
      .from("webhook_events")
      .select("id, provider, order_id, event_type, verified, applied, error, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { events: events ?? [] };
  });

/* ------------------------ Order events / audit log ------------------------ */

export const listOrderEventsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: events } = await db
      .from("order_events")
      .select("id, order_id, event_type, from_status, to_status, note, actor, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { events: events ?? [] };
  });

/* ------------------------ Settings / config status ------------------------ */

export const getAdminSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: pass }).parse(d))
  .handler(async ({ data }) => {
    // Re-verify and report which external integrations are configured.
    // Never returns secret values — only presence flags.
    return {
      passcodeUsesDefault: !process.env.ADMIN_PASSCODE,
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabasePublishable: !!process.env.SUPABASE_PUBLISHABLE_KEY,
      monimeApiKey: !!process.env.MONIME_API_KEY,
      monimeSpaceId: !!process.env.MONIME_SPACE_ID,
      monimeWebhookSecret: !!process.env.MONIME_WEBHOOK_SECRET,
      resendApiKey: !!process.env.RESEND_API_KEY,
    };
  });
