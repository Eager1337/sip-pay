// Monime Checkout — Orange Money & Afrimoney via Monime hosted checkout.
// Amounts stored in Sierra Leonean Leones (Le). Monime uses minor units,
// so we multiply the Leone amount by 100 for the "value" field.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { DRINKS } from "@/data/drinks";

const itemSchema = z.object({
  slug: z.string().max(60),
  name: z.string().max(120),
  qty: z.number().int().min(1).max(500),
  price: z.number().int().min(1).max(100000),
});

const paymentMethodSchema = z.enum(["orange_money", "afrimoney", "any"]);

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(16),
  customer: z.object({
    customer_name: z.string().min(2).max(100),
    phone: z.string().min(6).max(30),
    address: z.string().min(4).max(300),
    notes: z.string().max(500).optional().nullable(),
  }),
  origin: z.string().url().max(255),
  payment_method: paymentMethodSchema.default("any"),
});

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Validate items against catalog: slug exists, price matches, and qty is within
 * stock + maxPerOrder. Returns per-item errors so the UI can highlight lines.
 */
function validateItems(items: z.infer<typeof itemSchema>[]) {
  const errors: { slug: string; reason: string }[] = [];
  for (const it of items) {
    const d = DRINKS.find((x) => x.slug === it.slug);
    if (!d) { errors.push({ slug: it.slug, reason: "unavailable" }); continue; }
    if (d.price !== it.price) { errors.push({ slug: it.slug, reason: "price_changed" }); continue; }
    if (it.qty > d.maxPerOrder) {
      errors.push({ slug: it.slug, reason: `max_per_order_${d.maxPerOrder}` });
      continue;
    }
    if (d.stock !== null && it.qty > d.stock) {
      errors.push({ slug: it.slug, reason: `only_${d.stock}_in_stock` });
    }
  }
  return errors;
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

    const itemErrors = validateItems(data.items);
    if (itemErrors.length > 0) {
      return {
        ok: false as const,
        error: "Some items are unavailable or exceed limits.",
        itemErrors,
      };
    }

    const supabase = serverSupabase();
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsJson = data.items.map((i) => ({
      slug: i.slug, name: i.name, qty: i.qty, price: i.price,
    }));

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
        payment_method: data.payment_method,
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
      successUrl: `${data.origin}/order/${order.id}?paid=1`,
      cancelUrl: `${data.origin}/order/${order.id}?cancelled=1`,
      paymentOptions: {
        momo: { disable: false },
        card: { disable: true },
        bank: { disable: true },
      },
      metadata: {
        order_id: order.id,
        customer_name: data.customer.customer_name,
        phone: data.customer.phone,
        payment_method: data.payment_method,
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
      path: "/checkout",
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
      .select("id, status, monime_session_id, total_leones, monime_payment_id")
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
    const status = (json.result?.status ?? "").toLowerCase();
    const paid = status === "completed" || status === "paid";
    const failed = status === "failed" || status === "cancelled" || status === "expired";

    if (paid && !order.monime_payment_id) {
      // Idempotent: unique index on monime_payment_id prevents double-mark
      const deliveryCode = String(Math.floor(100000 + Math.random() * 900000));
      const commission = Math.round(((order.total_leones ?? 0) * 15) / 100);
      const { error } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          monime_payment_id: json.result?.paymentId ?? null,
          delivery_code: deliveryCode,
          rider_commission_pct: 15,
          rider_commission_leones: commission,
        } as never)
        .eq("id", order.id)
        .eq("status", "awaiting_payment"); // only flip if still pending
      if (!error) {
        await supabase.from("analytics_events").insert({
          event_type: "checkout_completed",
          path: "/order",
          metadata: { order_id: order.id, provider: "monime", via: "verify" } as never,
        });
      }
    } else if (failed && order.status === "awaiting_payment") {
      await supabase
        .from("orders")
        .update({ status: `payment_${status}` })
        .eq("id", order.id)
        .eq("status", "awaiting_payment");
    }

    return { paid, status };
  });

// Lightweight public order read — used by /order/:id status page.
// Guarded by knowing the uuid; RLS "Anyone can read an order by id" allows it.
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, total_leones, items, customer_name, phone, address, notes, payment_method, payment_provider, created_at, paid_at, delivered_at, cancelled_at")
      .eq("id", data.order_id)
      .maybeSingle();
    return order;
  });
