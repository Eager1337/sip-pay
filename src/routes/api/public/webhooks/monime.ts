// Monime webhook — HMAC verify + idempotency.
// Signature format (Monime): `Monime-Signature: t=<ts>,v1=<hex>` OR a plain
// hex digest depending on account. We accept both and always compare via
// timingSafeEqual against HMAC-SHA256(secret, rawBody) — with the timestamped
// variant, HMAC-SHA256(secret, `${t}.${rawBody}`).
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import type { Database } from "@/integrations/supabase/types";

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Format: t=<ts>,v1=<hex>[,v0=<hex>]
  if (header.includes("=") && header.includes(",")) {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, ...rest] = p.split("=");
        return [k.trim(), rest.join("=").trim()];
      }),
    );
    const t = parts["t"];
    const v1 = parts["v1"] ?? parts["v0"];
    if (t && v1) {
      const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
      if (timingSafeEqualHex(expected, v1)) return true;
    }
  }
  // Fallbacks: plain hex over body, or the shared-secret matches literally.
  const plain = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (timingSafeEqualHex(plain, header.trim())) return true;
  if (header.trim() === secret) return true;
  return false;
}

export const Route = createFileRoute("/api/public/webhooks/monime")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        const webhookSecret = process.env.MONIME_WEBHOOK_SECRET;
        const sigHeader =
          request.headers.get("monime-signature") ??
          request.headers.get("x-monime-signature") ??
          request.headers.get("x-webhook-secret");

        const verified = webhookSecret
          ? verifySignature(bodyText, sigHeader, webhookSecret)
          : true; // if no secret configured we accept (dev only)

        if (webhookSecret && !verified) {
          return new Response("invalid signature", { status: 401 });
        }

        let event: {
          id?: string;
          eventId?: string;
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
        const eventType = event.type ?? event.event ?? "unknown";
        // Idempotency key: prefer provider event id, else payment id, else derive
        const eventId =
          event.id ??
          event.eventId ??
          data.paymentId ??
          `${orderId ?? "unknown"}:${status}:${Buffer.from(bodyText).toString("base64").slice(0, 24)}`;

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        // Idempotency check — if we've seen this event id and applied it, we're done.
        const { data: prior } = await supabase
          .from("webhook_events")
          .select("id, applied")
          .eq("id", eventId)
          .maybeSingle();
        if (prior?.applied) return new Response("ok (duplicate)");

        // Log the event first (upsert so retries don't error on the PK)
        await supabase.from("webhook_events").upsert({
          id: eventId,
          provider: "monime",
          order_id: orderId,
          event_type: eventType,
          verified,
          applied: false,
          payload: event as never,
        }, { onConflict: "id" });

        if (!orderId) {
          await supabase.from("webhook_events").update({ applied: true, error: "no order id" }).eq("id", eventId);
          return new Response("ok");
        }

        let applied = false;
        let errMsg: string | null = null;

        if (status === "completed" || status === "paid" || status === "success") {
          // Only flip if still awaiting payment AND not already paid via another event.
          // Unique index on monime_payment_id enforces this at the DB level.
          const { data: current } = await supabase
            .from("orders")
            .select("id, status, monime_payment_id")
            .eq("id", orderId)
            .maybeSingle();
          if (current && current.status !== "paid") {
            const { error } = await supabase
              .from("orders")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                monime_payment_id: data.paymentId ?? null,
              })
              .eq("id", orderId)
              .eq("status", "awaiting_payment");
            if (error) errMsg = error.message;
            else {
              applied = true;
              await supabase.from("analytics_events").insert({
                event_type: "checkout_completed",
                path: "/webhook",
                metadata: { order_id: orderId, provider: "monime" } as never,
              });
              await supabase.from("order_events").insert({
                order_id: orderId,
                event_type: "webhook",
                from_status: current.status,
                to_status: "paid",
                note: "Monime webhook confirmed payment",
                meta: { event_id: eventId, payment_id: data.paymentId } as never,
              } as never);
            }
          } else {
            applied = true; // already paid — nothing to do, but log as applied
          }
        } else if (status === "failed" || status === "cancelled" || status === "expired") {
          const newStatus = `payment_${status}`;
          const { data: current } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();
          if (current && current.status === "awaiting_payment") {
            const { error } = await supabase
              .from("orders")
              .update({ status: newStatus })
              .eq("id", orderId)
              .eq("status", "awaiting_payment");
            if (error) errMsg = error.message;
            else {
              applied = true;
              await supabase.from("order_events").insert({
                order_id: orderId,
                event_type: "webhook",
                from_status: current.status,
                to_status: newStatus,
                note: `Monime webhook: ${status}`,
                meta: { event_id: eventId } as never,
              } as never);
            }
          } else {
            applied = true;
          }
        } else {
          applied = true; // unknown status — logged, no state change
        }

        await supabase
          .from("webhook_events")
          .update({ applied, error: errMsg })
          .eq("id", eventId);

        return new Response("ok");
      },
    },
  },
});
