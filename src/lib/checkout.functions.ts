// Monime Checkout — Orange Money & Afrimoney via Monime hosted checkout.
// Amounts stored in Sierra Leonean Leones (Le). Monime uses minor units,
// so we multiply the Leone amount by 100 for the "value" field.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const itemSchema = z.object({
  slug: z.string().max(60),
  name: z.string().max(120),
  qty: z.number().int().min(1).max(500),
  price: z.number().int().min(1).max(100000),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(16),
  customer: z.object({
    customer_name: z.string().min(2).max(100),
    phone: z.string().min(6).max(30),
    address: z.string().min(4).max(300),
    notes: z.string().max(500).optional().nullable(),
  }),
  origin: z.string().url().max(255),
});

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.MONIME_API_KEY;
    const spaceId = process.env.MONIME_SPACE_ID;
    if (!apiKey || !spaceId) {
      return {
        ok: false as const,
        error: "Mobile-money checkout is not configured yet.",
      };
    }

    const supabase = serverSupabase();
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsJson = data.items.map((i) => ({
      slug: i.slug, name: i.name, qty: i.qty, price: i.price,
    }));

    // Pre-create the order in 'awaiting_payment'
    const { data: order, error: insErr } = await supabase
      .from("orders")
      .insert({
        customer_name: data.customer.customer_name,
        phone: data.customer.phone,
        address: data.customer.address,
        notes: data.customer.notes ?? null,
        items: itemsJson as never,
        total_leones: total,
        status: "awaiting_payment",
        payment_provider: "monime",
      })
      .select("id")
      .single();
    if (insErr || !order) {
      console.error("[monime-checkout] order insert", insErr);
      return { ok: false as const, error: "Could not create order" };
    }

    const lineItems = data.items.map((it) => ({
      name: it.name,
      type: "custom" as const,
      quantity: it.qty,
      reference: it.slug,
      price: { currency: "SLE", value: it.price * it.qty * 100 },
    }));

    const body = {
      name: `KK Drinks order #${order.id.slice(0, 8)}`,
      description: `Order for ${data.customer.customer_name}`,
      lineItems,
      reference: order.id,
      callbackState: order.id,
      successUrl: `${data.origin}/?paid=1&order_id=${order.id}`,
      cancelUrl: `${data.origin}/store?cancelled=1`,
      paymentOptions: {
        // Enable mobile-money (Orange Money & Afrimoney); disable card/bank.
        momo: { disable: false },
        card: { disable: true },
        bank: { disable: true },
      },
      metadata: {
        order_id: order.id,
        customer_name: data.customer.customer_name,
        phone: data.customer.phone,
      },
    };

    const r = await fetch("https://api.monime.io/v1/checkout-sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": order.id,
        "Monime-Space-Id": spaceId,
      },
      body: JSON.stringify(body),
    });
    const json = await r.json() as {
      success?: boolean;
      messages?: unknown;
      result?: { id?: string; redirectUrl?: string };
    };
    if (!r.ok || !json.result?.redirectUrl) {
      console.error("[monime-checkout] api", r.status, json);
      return {
        ok: false as const,
        error: "Could not start mobile-money checkout. Please try again.",
      };
    }

    await supabase
      .from("orders")
      .update({ monime_session_id: json.result.id ?? null })
      .eq("id", order.id);

    await supabase.from("analytics_events").insert({
      event_type: "checkout_started",
      path: "/store",
      metadata: { order_id: order.id, total_leones: total, provider: "monime" } as never,
    });

    return {
      ok: true as const,
      url: json.result.redirectUrl,
      order_id: order.id,
    };
  });

// Verify the order after redirect back from Monime.
export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.MONIME_API_KEY;
    const spaceId = process.env.MONIME_SPACE_ID;
    const supabase = serverSupabase();

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, monime_session_id, total_leones")
      .eq("id", data.order_id)
      .maybeSingle();

    if (!order) return { paid: false, status: "unknown" };
    if (order.status === "paid") return { paid: true, status: "paid" };

    if (!apiKey || !spaceId || !order.monime_session_id) {
      return { paid: false, status: order.status };
    }

    const r = await fetch(
      `https://api.monime.io/v1/checkout-sessions/${encodeURIComponent(order.monime_session_id)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Monime-Space-Id": spaceId,
        },
      },
    );
    const json = await r.json() as {
      result?: { status?: string; paymentId?: string };
    };
    const status = json.result?.status ?? "";
    const paid = status.toLowerCase() === "completed" || status.toLowerCase() === "paid";

    if (paid) {
      await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          monime_payment_id: json.result?.paymentId ?? null,
        })
        .eq("id", order.id);
      await supabase.from("analytics_events").insert({
        event_type: "checkout_completed",
        path: "/",
        metadata: { order_id: order.id, provider: "monime" } as never,
      });
    }

    return { paid, status };
  });
