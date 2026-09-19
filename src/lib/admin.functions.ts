// Admin server functions — gated by the ADMIN_PASSCODE secret ("Eagerbeaver123").
// The client stores the passcode in sessionStorage after /admin verifies it,
// then passes it with every admin call.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkAdminPasscode } from "./admin-gate.functions";

async function adminClient(passcode: string | undefined) {
  if (!checkAdminPasscode(passcode)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const listSchema = z.object({
  passcode: z.string().min(1).max(200),
  search: z.string().max(120).optional().default(""),
  status: z.string().max(40).optional().default("all"),
  page: z.number().int().min(0).max(500).optional().default(0),
});

export const listOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => listSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const pageSize = 25;
    let q = admin
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.search && data.search.trim().length > 0) {
      const s = data.search.trim();
      q = q.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,id.eq.${s.match(/^[0-9a-f-]{36}$/i) ? s : "00000000-0000-0000-0000-000000000000"}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0, page: data.page, pageSize };
  });

const updateSchema = z.object({
  passcode: z.string().min(1).max(200),
  order_id: z.string().uuid(),
  action: z.enum(["mark_paid", "mark_failed", "mark_delivered", "cancel", "note"]),
  note: z.string().max(1000).optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const { data: current, error: getErr } = await admin
      .from("orders")
      .select("id, status, total_leones, delivery_code")
      .eq("id", data.order_id)
      .maybeSingle();
    if (getErr || !current) throw new Error("Order not found");

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let toStatus = current.status;

    switch (data.action) {
      case "mark_paid":
        updates.status = "paid";
        updates.paid_at = now;
        toStatus = "paid";
        if (!current.delivery_code) {
          updates.delivery_code = String(Math.floor(100000 + Math.random() * 900000));
          updates.rider_commission_pct = 15;
          updates.rider_commission_leones = Math.round(((current.total_leones ?? 0) * 15) / 100);
        }
        break;
      case "mark_failed":
        updates.status = "payment_failed";
        toStatus = "payment_failed";
        break;
      case "mark_delivered":
        updates.status = "delivered";
        updates.delivered_at = now;
        toStatus = "delivered";
        break;
      case "cancel":
        updates.status = "cancelled";
        updates.cancelled_at = now;
        toStatus = "cancelled";
        break;
      case "note":
        if (!data.note) throw new Error("Note required");
        updates.admin_notes = data.note;
        break;
    }

    const { error: updErr } = await admin
      .from("orders")
      .update(updates as never)
      .eq("id", data.order_id);
    if (updErr) throw new Error(updErr.message);

    await admin.from("order_events").insert({
      order_id: data.order_id,
      event_type: data.action === "note" ? "note" : "status_change",
      from_status: current.status,
      to_status: toStatus,
      note: data.note ?? null,
    } as never);

    return { ok: true, status: toStatus };
  });

export const getOrderDetail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    passcode: z.string().min(1).max(200),
    order_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const [{ data: order }, { data: events }, { data: webhooks }] = await Promise.all([
      admin.from("orders").select("*").eq("id", data.order_id).maybeSingle(),
      admin.from("order_events").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
      admin.from("webhook_events").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
    ]);
    return { order, events: events ?? [], webhooks: webhooks ?? [] };
  });

export const listRidersAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const { data: riders } = await admin
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false });
    return riders ?? [];
  });

/* -------------------- Customers -------------------- */

export const listCustomers = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      passcode: z.string().min(1).max(200),
      search: z.string().max(120).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    let q = admin
      .from("orders")
      .select("id, customer_name, customer_email, phone, address, city, district, total_leones, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const s = data.search.trim();
    if (s) q = q.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,customer_email.ilike.%${s}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    type Row = NonNullable<typeof rows>[number];
    const byKey = new Map<string, {
      key: string; name: string; phone: string; email: string | null; area: string | null;
      orders: number; spent_leones: number; paid_orders: number; last_order_at: string;
      recent: Array<{ id: string; status: string; total_leones: number; created_at: string }>;
    }>();
    for (const r of (rows ?? []) as Row[]) {
      const key = (r.phone || r.customer_email || r.customer_name || "unknown").trim().toLowerCase();
      const paid = ["paid", "out_for_delivery", "delivered"].includes(r.status);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          name: r.customer_name,
          phone: r.phone,
          email: r.customer_email ?? null,
          area: r.district ?? r.city ?? null,
          orders: 1,
          spent_leones: paid ? r.total_leones ?? 0 : 0,
          paid_orders: paid ? 1 : 0,
          last_order_at: r.created_at,
          recent: [{ id: r.id, status: r.status, total_leones: r.total_leones ?? 0, created_at: r.created_at }],
        });
      } else {
        existing.orders += 1;
        if (paid) { existing.spent_leones += r.total_leones ?? 0; existing.paid_orders += 1; }
        if (existing.recent.length < 8) {
          existing.recent.push({ id: r.id, status: r.status, total_leones: r.total_leones ?? 0, created_at: r.created_at });
        }
      }
    }
    const customers = [...byKey.values()].sort(
      (a, b) => new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime(),
    );
    return { customers };
  });

/* -------------------- Rider approvals -------------------- */

export const listRiderApplications = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      passcode: z.string().min(1).max(200),
      status: z.string().max(30).optional().default("all"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    let q = admin.from("riders").select("*").order("created_at", { ascending: false }).limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: riders, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (riders ?? []).map((r) => r.id);
    const stats = new Map<string, { deliveries: number; earned: number }>();
    if (ids.length) {
      const { data: payouts } = await admin
        .from("rider_payouts")
        .select("rider_id, amount_leones")
        .in("rider_id", ids);
      for (const p of payouts ?? []) {
        const s = stats.get(p.rider_id) ?? { deliveries: 0, earned: 0 };
        s.deliveries += 1;
        s.earned += p.amount_leones ?? 0;
        stats.set(p.rider_id, s);
      }
    }
    return (riders ?? []).map((r) => ({
      ...r,
      deliveries: stats.get(r.id)?.deliveries ?? 0,
      earned_leones: stats.get(r.id)?.earned ?? 0,
      missing: [
        !r.display_name && "name",
        !r.phone && "phone",
        !r.vehicle && "vehicle",
      ].filter(Boolean) as string[],
    }));
  });

export const setRiderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      passcode: z.string().min(1).max(200),
      rider_id: z.string().uuid(),
      action: z.enum(["approve", "reject", "suspend", "reactivate"]),
      reason: z.string().max(400).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const now = new Date().toISOString();
    const updates: Record<string, unknown> =
      data.action === "approve"
        ? { status: "approved", active: true, approved_at: now, rejection_reason: null }
        : data.action === "reject"
        ? { status: "rejected", active: false, rejection_reason: data.reason ?? "Application rejected" }
        : data.action === "suspend"
        ? { status: "suspended", active: false, rejection_reason: data.reason ?? "Suspended" }
        : { status: "approved", active: true, rejection_reason: null };
    const { error } = await admin.from("riders").update(updates as never).eq("id", data.rider_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------- Payments ledger -------------------- */

export const listPaymentsLedger = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      passcode: z.string().min(1).max(200),
      status: z.string().max(30).optional().default("all"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const { data: orders } = await admin
      .from("orders")
      .select("id, customer_name, phone, total_leones, status, payment_method, payment_provider, monime_transaction_id, monime_payment_code_id, monime_ussd_code, manual_transfer_ref, manual_transfer_number, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    const { data: payouts } = await admin
      .from("rider_payouts")
      .select("id, rider_id, order_id, amount_leones, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    const { data: hooks } = await admin
      .from("webhook_events")
      .select("id, provider, order_id, event_type, verified, applied, error, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    let rows = orders ?? [];
    if (data.status !== "all") rows = rows.filter((r) => r.status === data.status);

    const paid = (orders ?? []).filter((o) => o.paid_at);
    const totals = {
      collected: paid.reduce((s, o) => s + (o.total_leones ?? 0), 0),
      paid_count: paid.length,
      pending_count: (orders ?? []).filter((o) => o.status === "awaiting_payment").length,
      payouts_pending: (payouts ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount_leones ?? 0), 0),
    };
    return { rows, payouts: payouts ?? [], hooks: hooks ?? [], totals };
  });
