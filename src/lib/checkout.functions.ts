// Monime Checkout — hosted checkout for Orange Money, Afrimoney and cards.
// Amounts are stored in Sierra Leonean Leones (Le). Monime uses minor units,
// so one Leone is sent as value=100.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DRINKS } from "@/data/drinks";

const DELIVERY_FEE_WESTERN = 15;
const DELIVERY_FEE_UPCOUNTRY = 25;
const BULK_DISCOUNT_MIN = 120;
const BULK_DISCOUNT_LEONES = 10;
const MONIME_VERSION = "caph.2025-08-23";

const itemSchema = z.object({
  slug: z.string().max(60),
  name: z.string().max(120),
  qty: z.number().int().min(1).max(500),
  price: z.number().int().min(1).max(100000),
});

const paymentMethodSchema = z.enum(["orange_money", "afrimoney", "card"]);

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email().max(255).nullable().optional(),
);

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(16),
  customer: z.object({
    customer_name: z.string().min(2).max(100),
    email: optionalEmailSchema,
    phone: z.string().min(6).max(30),
    mobile_money_number: z.string().max(30).optional().nullable(),
    address: z.string().min(4).max(300),
    city: z.string().max(80).optional().nullable().default("Freetown"),
    district: z.string().max(80).optional().nullable().default("Western Area"),
    zone_id: z.string().uuid().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }),
  origin: z.string().url().max(255),
  client_checkout_id: z.string().uuid().optional().nullable(),
  payment_method: paymentMethodSchema.default("card"),
});

type CheckoutInput = z.infer<typeof inputSchema>;
type PaymentMethod = z.infer<typeof paymentMethodSchema>;

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

function deliveryFeeFor(district: string | null | undefined): number {
  const d = (district ?? "").toLowerCase();
  return d.includes("western") || d.includes("freetown") ? DELIVERY_FEE_WESTERN : DELIVERY_FEE_UPCOUNTRY;
}

/** Fee comes from the admin-managed delivery_zones table when a zone is chosen. */
export async function resolveDeliveryFee(
  zoneId: string | null | undefined,
  district: string | null | undefined,
): Promise<number> {
  if (zoneId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("delivery_zones")
      .select("fee_leones, active")
      .eq("id", zoneId)
      .maybeSingle();
    if (data?.active) return data.fee_leones as number;
  }
  return deliveryFeeFor(district);
}

async function priceBreakdown(
  items: CheckoutInput["items"],
  district: string | null | undefined,
  zoneId?: string | null,
) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = await resolveDeliveryFee(zoneId, district);
  const discount = subtotal >= BULK_DISCOUNT_MIN ? BULK_DISCOUNT_LEONES : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  return { subtotal, deliveryFee, discount, total };
}

function monimePaymentOptions(method: PaymentMethod) {
  if (method === "orange_money") {
    return {
      momo: { disable: false, enabledProviders: ["m17"] },
      card: { disable: true },
      bank: { disable: true },
      wallet: { disable: true },
    };
  }
  if (method === "afrimoney") {
    return {
      momo: { disable: false, enabledProviders: ["m18"] },
      card: { disable: true },
      bank: { disable: true },
      wallet: { disable: true },
    };
  }
  return {
    card: { disable: false },
    momo: { disable: true },
    bank: { disable: true },
    wallet: { disable: true },
  };
}

function deliveryCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    return { message: text };
  }
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** KK Drinks receiving wallets shown on the dial-to-pay screen. */
export const KK_AFRIMONEY_NUMBER = "033695803";
export const KK_ORANGE_NUMBER = "073095177";

function monimeHeaders(apiKey: string, spaceId: string, idempotencyKey?: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Monime-Space-Id": spaceId,
    "Monime-Version": MONIME_VERSION,
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
}

/**
 * Normalise a Sierra Leone mobile number to Monime's expected MSISDN
 * (232 + 8 local digits). Returns null when it doesn't look valid.
 */
function toSlMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("232")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  if (d.length !== 8) return null;
  return `232${d}`;
}

/** True when Monime rejected hosted checkout because the key is test-mode. */
function isCheckoutUnavailable(status: number, json: Record<string, unknown>): boolean {
  if (status === 403 || status === 401 || status === 404 || status >= 500) return true;
  const err = (json.error ?? {}) as { reason?: string; message?: string };
  const text = `${err.reason ?? ""} ${err.message ?? ""} ${String(json.message ?? "")}`.toLowerCase();
  return text.includes("access_denied") || text.includes("test mode") || text.includes("not supported");
}

export type PaymentCodeResult = {
  id: string;
  ussdCode: string | null;
  expireTime: string | null;
  status: string | null;
};

/**
 * Payment codes are the mobile-money fallback: Monime returns a USSD string the
 * customer dials on their AfriMoney / Orange Money handset to push the exact
 * amount to KK Drinks. Works where hosted checkout-sessions are unavailable.
 */
async function createMonimePaymentCode(args: {
  apiKey: string;
  spaceId: string;
  orderId: string;
  amountLeones: number;
  customerName: string;
  payerNumber: string | null;
  idempotencyKey: string;
}): Promise<{ ok: true; code: PaymentCodeResult } | { ok: false; error: string }> {
  const msisdn = toSlMsisdn(args.payerNumber);
  const body: Record<string, unknown> = {
    name: `KK Drinks #${args.orderId.slice(0, 8).toUpperCase()}`,
    mode: "one_time",
    amount: { currency: "SLE", value: Math.round(args.amountLeones * 100) },
    duration: "30m",
    reference: args.orderId,
    customer: { name: args.customerName.slice(0, 80) },
    metadata: { order_id: args.orderId },
  };
  // Locking the code to the payer's own wallet stops anyone else paying it.
  if (msisdn) body.authorizedPhoneNumber = msisdn;

  const res = await fetch("https://api.monime.io/v1/payment-codes", {
    method: "POST",
    headers: monimeHeaders(args.apiKey, args.spaceId, args.idempotencyKey),
    body: JSON.stringify(body),
  });
  const json = safeJson(await res.text()) as {
    result?: { id?: string; ussdCode?: string; expireTime?: string; status?: string };
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok || !json.result?.id) {
    console.error("[monime-payment-code]", res.status, json);
    return { ok: false, error: json.error?.message ?? json.message ?? "Could not create a payment code." };
  }
  return {
    ok: true,
    code: {
      id: json.result.id,
      ussdCode: json.result.ussdCode ?? null,
      expireTime: json.result.expireTime ?? null,
      status: json.result.status ?? null,
    },
  };
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
      return { ok: false as const, error: "Secure checkout is not configured yet." };
    }

    if ((data.payment_method === "orange_money" || data.payment_method === "afrimoney") &&
        !data.customer.mobile_money_number?.trim()) {
      return { ok: false as const, error: "Enter the mobile money number registered for this wallet." };
    }

    const itemErrors = validateItems(data.items);
    if (itemErrors.length > 0) {
      return { ok: false as const, error: "Some items are unavailable or exceed limits.", itemErrors };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orders = supabaseAdmin.from("orders") as any;
    const analyticsEvents = supabaseAdmin.from("analytics_events") as any;
    const { subtotal, deliveryFee, discount, total } = await priceBreakdown(
      data.items,
      data.customer.district,
      data.customer.zone_id,
    );
    const itemsJson = data.items.map((i) => ({ slug: i.slug, name: i.name, qty: i.qty, price: i.price }));

    let existing: { id: string; status: string; monime_checkout_url: string | null } | null = null;
    if (data.client_checkout_id) {
      const { data: row } = await orders
        .select("id, status, monime_checkout_url")
        .eq("client_checkout_id", data.client_checkout_id)
        .maybeSingle();
      existing = row as { id: string; status: string; monime_checkout_url: string | null } | null;
      if (existing?.status === "awaiting_payment" && existing.monime_checkout_url) {
        return { ok: true as const, url: existing.monime_checkout_url, order_id: existing.id, reused: true as const };
      }
      if (existing?.status === "paid") {
        return { ok: true as const, url: `${data.origin}/order/${existing.id}?paid=1`, order_id: existing.id, reused: true as const };
      }
    }

    const orderPayload = {
      customer_name: data.customer.customer_name,
      customer_email: data.customer.email ?? null,
      phone: cleanPhone(data.customer.phone),
      address: data.customer.address,
      city: data.customer.city,
      district: data.customer.district,
      notes: data.customer.notes ?? null,
      items: itemsJson as never,
      total_leones: total,
      delivery_fee_leones: deliveryFee,
      discount_leones: discount,
      status: "awaiting_payment",
      payment_provider: "monime",
      payment_method: data.payment_method,
      payment_failure_reason: null,
      client_checkout_id: data.client_checkout_id ?? null,
    };

    let order: { id: string } | null = existing ? { id: existing.id } : null;
    if (existing) {
      const { error } = await orders
        .update({ ...orderPayload, monime_session_id: null, monime_checkout_url: null } as never)
        .eq("id", existing.id);
      if (error) {
        console.error("[monime-checkout] order retry update", error);
        return { ok: false as const, error: "Could not prepare this order for retry." };
      }
    } else {
      const { data: inserted, error } = await orders
        .insert(orderPayload as never)
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("[monime-checkout] order insert", error);
        return { ok: false as const, error: "Could not create order" };
      }
      order = inserted;
    }

    if (!order) return { ok: false as const, error: "Could not create order" };
    const orderId = order.id;

    const lineItems = data.items.map((it) => ({
      name: it.name,
      type: "custom" as const,
      quantity: it.qty,
      reference: it.slug,
      description: DRINKS.find((drink) => drink.slug === it.slug)?.volume,
      price: { currency: "SLE", value: it.price * 100 },
    }));

    const netDeliveryFee = Math.max(0, deliveryFee - discount);
    if (netDeliveryFee > 0) {
      lineItems.push({
        name: discount > 0 ? "Delivery fee after discount" : "Delivery fee",
        type: "custom" as const,
        quantity: 1,
        reference: "delivery",
        description: discount > 0 ? `Delivery Le ${deliveryFee}, discount Le ${discount}` : "Local delivery",
        price: { currency: "SLE", value: netDeliveryFee * 100 },
      });
    }

    const body = {
      name: `KK Drinks order #${orderId.slice(0, 8)}`,
      description: `Order for ${data.customer.customer_name}`,
      lineItems,
      reference: orderId,
      callbackState: orderId,
      successUrl: `${data.origin}/order/${orderId}?paid=1`,
      cancelUrl: `${data.origin}/order/${orderId}?cancelled=1`,
      paymentOptions: monimePaymentOptions(data.payment_method),
      brandingOptions: { primaryColor: "#148C8C" },
      metadata: {
        order_id: orderId,
        customer_name: data.customer.customer_name,
        phone: cleanPhone(data.customer.phone),
        momo_number: data.customer.mobile_money_number ? cleanPhone(data.customer.mobile_money_number) : "",
        payment_method: data.payment_method,
        subtotal_leones: String(subtotal),
        delivery_fee_leones: String(deliveryFee),
        discount_leones: String(discount),
      },
    };

    const idempotencyKey = existing && existing.status !== "awaiting_payment"
      ? `${orderId.slice(0, 8)}-${Date.now()}`
      : (data.client_checkout_id ?? orderId);

    const response = await fetch("https://api.monime.io/v1/checkout-sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "Monime-Space-Id": spaceId,
        "Monime-Version": MONIME_VERSION,
      },
      body: JSON.stringify(body),
    });
    const json = safeJson(await response.text()) as {
      success?: boolean;
      message?: string;
      messages?: unknown;
      result?: { id?: string; redirectUrl?: string; orderNumber?: string; status?: string };
    };
    if (!response.ok || !json.result?.redirectUrl) {
      console.error("[monime-checkout] api", response.status, json);

      // Hosted checkout unavailable (test-mode key / access_denied) — fall back
      // to a Monime payment code the customer dials on their own handset.
      if (isCheckoutUnavailable(response.status, json)) {
        const fallback = await createMonimePaymentCode({
          apiKey,
          spaceId,
          orderId,
          amountLeones: total,
          customerName: data.customer.customer_name,
          payerNumber: data.customer.mobile_money_number ?? data.customer.phone,
          idempotencyKey: `pc-${idempotencyKey}`,
        });
        if (fallback.ok) {
          await orders
            .update({
              status: "awaiting_payment",
              monime_payment_code_id: fallback.code.id,
              monime_ussd_code: fallback.code.ussdCode,
              payment_code_expires_at: fallback.code.expireTime,
              monime_checkout_url: null,
              payment_failure_reason: null,
            } as never)
            .eq("id", orderId);

          await analyticsEvents.insert({
            event_type: "checkout_started",
            path: "/checkout",
            metadata: {
              order_id: orderId, total_leones: total, provider: "monime",
              payment_method: data.payment_method, mode: "payment_code",
            } as never,
          });

          return {
            ok: true as const,
            mode: "ussd" as const,
            order_id: orderId,
            ussd_code: fallback.code.ussdCode,
            payment_code_id: fallback.code.id,
            expires_at: fallback.code.expireTime,
            url: `${data.origin}/order/${orderId}`,
          };
        }
      }

      await orders
        .update({
          status: "payment_failed",
          payment_failure_reason: json.message ?? "Could not start Monime checkout",
        } as never)
        .eq("id", orderId);
      return {
        ok: false as const,
        error: "Could not start secure Monime checkout. Please check the payment number and try again.",
      };
    }


    await orders
      .update({
        monime_session_id: json.result.id ?? null,
        monime_checkout_url: json.result.redirectUrl,
        monime_order_number: json.result.orderNumber ?? null,
        status: "awaiting_payment",
        payment_failure_reason: null,
      } as never)
      .eq("id", orderId);

    await analyticsEvents.insert({
      event_type: "checkout_started",
      path: "/checkout",
      metadata: { order_id: orderId, total_leones: total, provider: "monime", payment_method: data.payment_method } as never,
    });

    return { ok: true as const, mode: "redirect" as const, url: json.result.redirectUrl, order_id: orderId };
  });

// Verify the order after redirect back from Monime.
export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.MONIME_API_KEY;
    const spaceId = process.env.MONIME_SPACE_ID;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orders = supabaseAdmin.from("orders") as any;
    const analyticsEvents = supabaseAdmin.from("analytics_events") as any;
    const orderEvents = supabaseAdmin.from("order_events") as any;

    const { data: order } = await orders
      .select("id, status, monime_session_id, total_leones, monime_payment_id, delivery_code, rider_commission_pct")
      .eq("id", data.order_id)
      .maybeSingle();

    if (!order) return { paid: false, status: "unknown", reason: null };
    if (order.status === "paid") return { paid: true, status: "paid", reason: null };
    if (!apiKey || !spaceId || !order.monime_session_id) return { paid: false, status: order.status, reason: null };

    const response = await fetch(
      `https://api.monime.io/v1/checkout-sessions/${encodeURIComponent(order.monime_session_id)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Monime-Space-Id": spaceId,
          "Monime-Version": MONIME_VERSION,
        },
      },
    );
    const json = safeJson(await response.text()) as { result?: Record<string, unknown>; message?: string };
    const result = json.result ?? {};
    const status = String(result.status ?? "").toLowerCase();
    const paid = status === "completed" || status === "paid";
    const failed = status === "failed" || status === "cancelled" || status === "expired";
    const transactionId =
      stringFrom(result.paymentId) ??
      stringFrom(result.transactionId) ??
      stringFrom(result.orderNumber) ??
      order.monime_session_id;

    if (paid && !order.monime_payment_id) {
      const pct = Number(order.rider_commission_pct ?? 15);
      const commission = Math.round(((order.total_leones ?? 0) * pct) / 100);
      const { error } = await orders
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          monime_payment_id: transactionId,
          monime_transaction_id: transactionId,
          monime_order_number: stringFrom(result.orderNumber),
          delivery_code: order.delivery_code ?? deliveryCode(),
          rider_commission_pct: pct,
          rider_commission_leones: commission,
          payment_failure_reason: null,
        } as never)
        .eq("id", order.id)
        .neq("status", "paid");
      if (!error) {
        await analyticsEvents.insert({
          event_type: "checkout_completed",
          path: "/order",
          metadata: { order_id: order.id, provider: "monime", via: "verify" } as never,
        });
        await orderEvents.insert({
          order_id: order.id,
          event_type: "payment_verified",
          from_status: order.status,
          to_status: "paid",
          note: "Monime checkout verification confirmed payment",
          meta: { transaction_id: transactionId, order_number: stringFrom(result.orderNumber) } as never,
        } as never);
      }
    } else if (failed && order.status === "awaiting_payment") {
      await orders
        .update({
          status: `payment_${status}`,
          payment_failure_reason: json.message ?? `Monime status: ${status}`,
        } as never)
        .eq("id", order.id)
        .eq("status", "awaiting_payment");
    }

    return { paid, status, transaction_id: transactionId, reason: json.message ?? null };
  });

// Lightweight public order read — used by /order/:id status page.
// Guarded by knowing the uuid; returns only customer-facing order details.
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orders = supabaseAdmin.from("orders") as any;
    const { data: order } = await orders
      .select("id, status, total_leones, delivery_fee_leones, discount_leones, items, customer_name, customer_email, phone, address, city, district, notes, payment_method, payment_provider, monime_payment_id, monime_transaction_id, monime_order_number, payment_failure_reason, created_at, paid_at, delivered_at, cancelled_at")
      .eq("id", data.order_id)
      .maybeSingle();
    return order;
  });
