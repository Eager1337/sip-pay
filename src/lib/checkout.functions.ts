// Stripe checkout — creates a Checkout Session for an order.
// Prices stored in Sierra Leonean Leones (Le); Stripe doesn't support SLE,
// so we charge in USD using a configurable conversion rate.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const SLE_PER_USD = Number(process.env.SLE_PER_USD ?? "22");

const itemSchema = z.object({
  slug: z.string().max(60),
  name: z.string().max(120),
  qty: z.number().int().min(1).max(500),
  price: z.number().int().min(1).max(100000),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  customer: z.object({
    customer_name: z.string().min(2).max(100),
    phone: z.string().min(6).max(30),
    address: z.string().min(4).max(300),
    notes: z.string().max(500).optional().nullable(),
  }),
  origin: z.string().url().max(255),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { ok: false as const, error: "Stripe is not configured yet." };
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsJson = data.items.map((i) => ({
      slug: i.slug, name: i.name, qty: i.qty, price: i.price,
    }));

    // Pre-create the order in 'awaiting_payment' state
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
      })
      .select("id")
      .single();
    if (insErr || !order) {
      console.error("[create-checkout] order insert", insErr);
      return { ok: false as const, error: "Could not create order" };
    }

    // Build Stripe Checkout Session via REST API (no SDK needed)
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${data.origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${data.origin}/store?cancelled=1`);
    form.set("metadata[order_id]", order.id);
    form.set("metadata[customer_name]", data.customer.customer_name);
    form.set("metadata[phone]", data.customer.phone);
    data.items.forEach((it, idx) => {
      const usd = Math.max(0.5, it.price / SLE_PER_USD);
      const unitAmount = Math.round(usd * 100); // cents
      form.set(`line_items[${idx}][quantity]`, String(it.qty));
      form.set(`line_items[${idx}][price_data][currency]`, "usd");
      form.set(`line_items[${idx}][price_data][unit_amount]`, String(unitAmount));
      form.set(`line_items[${idx}][price_data][product_data][name]`, it.name);
    });

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = await r.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!r.ok || !json.url) {
      console.error("[create-checkout] stripe", json);
      return { ok: false as const, error: json.error?.message ?? "Stripe error" };
    }

    await supabase
      .from("orders")
      .update({ stripe_session_id: json.id ?? null })
      .eq("id", order.id);

    await supabase.from("analytics_events").insert({
      event_type: "checkout_started",
      path: "/store",
      metadata: { order_id: order.id, total_leones: total } as never,
    });

    return { ok: true as const, url: json.url, order_id: order.id };
  });

// Verify after redirect back from Stripe.
export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ session_id: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { paid: false, status: "unconfigured" };

    const r = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.session_id)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const json = await r.json() as { payment_status?: string };
    const paid = json.payment_status === "paid";

    if (paid) {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("stripe_session_id", data.session_id);
      await supabase.from("analytics_events").insert({
        event_type: "checkout_completed",
        path: "/",
        metadata: { session_id: data.session_id } as never,
      });
    }
    return { paid, status: json.payment_status ?? "unknown" };
  });
