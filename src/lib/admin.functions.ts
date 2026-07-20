// Admin server functions: bootstrap, list/search orders, update order status.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (mine) return { ok: true, alreadyAdmin: true };
      throw new Error("Admin already exists. Ask the existing admin to grant you access.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true, granted: true };
  });

const listSchema = z.object({
  search: z.string().max(120).optional().default(""),
  status: z.string().max(40).optional().default("all"),
  page: z.number().int().min(0).max(500).optional().default(0),
});

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const pageSize = 25;
    let q = admin
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.search && data.search.trim().length > 0) {
      const s = data.search.trim();
      // ilike search on name/phone/id
      q = q.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,id.eq.${s.match(/^[0-9a-f-]{36}$/i) ? s : "00000000-0000-0000-0000-000000000000"}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0, page: data.page, pageSize };
  });

const updateSchema = z.object({
  order_id: z.string().uuid(),
  action: z.enum(["mark_paid", "mark_failed", "mark_delivered", "cancel", "note"]),
  note: z.string().max(1000).optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const { data: current, error: getErr } = await admin
      .from("orders")
      .select("id, status")
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
      actor: context.userId,
    });

    return { ok: true, status: toStatus };
  });

export const getOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const [{ data: order }, { data: events }, { data: webhooks }] = await Promise.all([
      admin.from("orders").select("*").eq("id", data.order_id).maybeSingle(),
      admin.from("order_events").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
      admin.from("webhook_events").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
    ]);
    return { order, events: events ?? [], webhooks: webhooks ?? [] };
  });
