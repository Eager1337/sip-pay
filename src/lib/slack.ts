// Slack notifications — fire-and-forget; no-ops when SLACK_WEBHOOK_URL is unset.
// Used to alert on payment confirmation so every order's status is trackable.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Post a plain-text/block message to the configured Slack webhook. */
export async function notifySlack(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (e) {
    console.error("[slack] notify failed", e);
  }
}

/**
 * Notify Slack that an order's payment was confirmed. Fetches customer +
 * total details from the order so both the verify-poll and webhook paths can
 * call it with just the order id. Never throws.
 */
export async function notifyPaymentPaid(args: {
  orderId: string;
  via: string;
  totalLeones?: number | null;
}): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  let total = args.totalLeones ?? null;
  let name: string | null = null;
  let phone: string | null = null;
  let method: string | null = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const sb = createClient<Database>(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data } = await sb.from("orders")
        .select("customer_name, phone, total_leones, payment_method")
        .eq("id", args.orderId)
        .maybeSingle();
      if (data) {
        name = data.customer_name;
        phone = data.phone;
        if (typeof data.total_leones === "number") total = data.total_leones;
        method = data.payment_method;
      }
    } catch {
      /* ignore — best-effort enrichment */
    }
  }
  const lines = [
    "✅ *Payment received* — KK Drinks",
    `Order: \`${args.orderId.slice(0, 8)}\``,
    name ? `Customer: ${name}` : null,
    phone ? `Phone: ${phone}` : null,
    `Total: Le ${(total ?? 0).toLocaleString()}`,
    method ? `Method: ${method}` : null,
    `Confirmed via: ${args.via}`,
    `${process.env.BASE44_PUBLIC_HOST_SUFFIX ? "https://3000-" + process.env.BASE44_PUBLIC_HOST_SUFFIX + "/order/" + args.orderId : ""}`.trim() || null,
  ].filter(Boolean);
  await notifySlack(lines.join("\n"));
}
