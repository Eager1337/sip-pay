// Admin analytics — protected. Returns event counts grouped by type
// plus a recent log, filtered by date range and category (store/wholesale/all).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  category: z.enum(["all", "store", "wholesale"]).default("all"),
});

const STORE_EVENTS = ["page_view", "add_to_cart", "checkout_started", "checkout_completed", "store_form_submit"];
const WHOLESALE_EVENTS = ["wholesale_form_submit", "chat_open"];

export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Require admin — checked against the caller's own role row (RLS-scoped)
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    let typeFilter: string[] | null = null;
    if (data.category === "store") typeFilter = STORE_EVENTS;
    else if (data.category === "wholesale") typeFilter = WHOLESALE_EVENTS;

    let q = context.supabase
      .from("analytics_events")
      .select("id, event_type, path, session_id, metadata, created_at")
      .gte("created_at", data.start)
      .lte("created_at", data.end)
      .order("created_at", { ascending: false })
      .limit(500);
    if (typeFilter) q = q.in("event_type", typeFilter);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const summary: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const sessions = new Set<string>();
    for (const r of rows ?? []) {
      summary[r.event_type] = (summary[r.event_type] ?? 0) + 1;
      const day = (r.created_at as string).slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
      if (r.session_id) sessions.add(r.session_id);
    }

    return {
      total: rows?.length ?? 0,
      uniqueSessions: sessions.size,
      summary,
      byDay,
      events: rows ?? [],
    };
  });
