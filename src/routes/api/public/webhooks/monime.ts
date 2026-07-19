// Monime webhook — updates order status when payment settles.
// Public route (bypasses auth); we verify the shared-secret header sent by Monime.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/webhooks/monime")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        const webhookSecret = process.env.MONIME_WEBHOOK_SECRET;
        if (webhookSecret) {
          const provided =
            request.headers.get("monime-signature") ??
            request.headers.get("x-monime-signature") ??
            request.headers.get("x-webhook-secret") ??
            "";
          if (provided !== webhookSecret) {
            return new Response("invalid signature", { status: 401 });
          }
        }

        let event: {
          type?: string;
          event?: string;
          data?: {
            id?: string;
            status?: string;
            reference?: string;
            callbackState?: string;
            metadata?: { order_id?: string };
            paymentId?: string;
          };
        } = {};
        try { event = JSON.parse(bodyText); } catch { /* ignore */ }

        const data = event.data ?? {};
        const orderId =
          data.metadata?.order_id ??
          data.callbackState ??
          data.reference ??
          null;
        const status = (data.status ?? "").toLowerCase();
        if (!orderId) return new Response("ok");

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        if (status === "completed" || status === "paid" || status === "success") {
          await supabase
            .from("orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              monime_payment_id: data.paymentId ?? null,
            })
            .eq("id", orderId);
          await supabase.from("analytics_events").insert({
            event_type: "checkout_completed",
            path: "/webhook",
            metadata: { order_id: orderId, provider: "monime" } as never,
          });
        } else if (status === "failed" || status === "cancelled" || status === "expired") {
          await supabase
            .from("orders")
            .update({ status: `payment_${status}` })
            .eq("id", orderId);
        }

        return new Response("ok");
      },
    },
  },
});
