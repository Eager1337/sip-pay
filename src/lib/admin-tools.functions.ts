// Admin AI assistant + safe payment verification checklist.
// Both gated by the admin passcode. Secret values are never returned —
// only presence and mode (test/live).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkAdminPasscode } from "./admin-gate.functions";

async function adminClient(passcode: string) {
  if (!checkAdminPasscode(passcode)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ---------------- AI operations assistant ---------------- */

export const askOpsAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      passcode: z.string().min(1).max(200),
      question: z.string().min(2).max(1000),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
        .max(10)
        .optional()
        .default([]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { answer: "The AI assistant is not configured yet." };

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: orders }, { data: riders }, { data: payouts }, { data: hooks }] = await Promise.all([
      admin
        .from("orders")
        .select("id, customer_name, phone, district, city, status, total_leones, delivery_fee_leones, payment_method, rider_id, created_at, paid_at, delivered_at, items")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300),
      admin.from("riders").select("id, display_name, phone, vehicle, status, active, created_at").limit(200),
      admin.from("rider_payouts").select("rider_id, order_id, amount_leones, status, created_at").gte("created_at", since).limit(300),
      admin.from("webhook_events").select("event_type, verified, applied, error, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(50),
    ]);

    const compactOrders = (orders ?? []).map((o) => ({
      id: String(o.id).slice(0, 8),
      c: o.customer_name, ph: o.phone, area: o.district ?? o.city,
      st: o.status, tot: o.total_leones, pay: o.payment_method, rider: o.rider_id ? String(o.rider_id).slice(0, 8) : null,
      at: o.created_at, paid: o.paid_at, deliv: o.delivered_at,
      items: Array.isArray(o.items) ? (o.items as Array<{ name?: string; qty?: number }>).map((i) => `${i.name}x${i.qty}`).join(",") : "",
    }));
    const context = JSON.stringify({
      now: new Date().toISOString(),
      currency: "Leones (Le)",
      orders_last_30d: compactOrders,
      riders: (riders ?? []).map((r) => ({ id: String(r.id).slice(0, 8), n: r.display_name, ph: r.phone, v: r.vehicle, st: r.status, active: r.active })),
      rider_payouts: payouts ?? [],
      webhook_events: hooks ?? [],
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are the operations analyst for KK Drinks, a juice delivery business in Freetown, Sierra Leone. Answer the admin's question using ONLY the JSON data provided. Be concise and practical: give numbers, short tables or bullet lists, and one or two recommended actions when useful. Amounts are in Leones (Le). Paid statuses: paid, out_for_delivery, delivered. If the data can't answer, say so plainly. Riders earn 15% commission.\n\nDATA:\n" +
              context,
          },
          ...data.history,
          { role: "user", content: data.question },
        ],
      }),
    });
    if (res.status === 429) return { answer: "Too many questions right now — please wait a moment and try again." };
    if (res.status === 402) return { answer: "AI credits have run out for this workspace. Add credits to keep using the assistant." };
    if (!res.ok) return { answer: "The assistant couldn't answer just now. Please try again." };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { answer: json.choices?.[0]?.message?.content ?? "No answer." };
  });

/* ---------------- Payment verification checklist ---------------- */

type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };

export const runPaymentChecklist = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ passcode: z.string().min(1).max(200), simulate: z.boolean().optional().default(false) }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await adminClient(data.passcode);
    const checks: Check[] = [];
    const apiKey = process.env.MONIME_API_KEY ?? "";
    const spaceId = process.env.MONIME_SPACE_ID ?? "";
    const whSecret = process.env.MONIME_WEBHOOK_SECRET ?? "";
    const isLive = apiKey.startsWith("mon_") && !apiKey.startsWith("mon_test_");

    checks.push({
      id: "key", label: "Monime API key saved",
      status: apiKey ? "pass" : "fail",
      detail: apiKey ? `Key present (${isLive ? "LIVE" : "TEST"} mode). Value hidden.` : "No Monime key saved.",
    });
    checks.push({
      id: "space", label: "Monime Space ID saved",
      status: spaceId ? "pass" : "fail", detail: spaceId ? "Present. Value hidden." : "Missing.",
    });
    checks.push({
      id: "webhook_secret", label: "Webhook signing secret saved",
      status: whSecret ? "pass" : "fail",
      detail: whSecret ? "Present — payment callbacks are signature-checked." : "Missing — callbacks can't be verified.",
    });

    // Hosted checkout reachability (read-only list call, no payment made)
    if (apiKey && spaceId) {
      const headers = { Authorization: `Bearer ${apiKey}`, "Monime-Space-Id": spaceId, "Monime-Version": "caph.2025-08-23" };
      try {
        const r = await fetch("https://api.monime.io/v1/checkout-sessions?limit=1", { headers });
        checks.push({
          id: "hosted", label: "Hosted checkout (VisaCard) available",
          status: r.ok ? "pass" : "warn",
          detail: r.ok ? "Monime accepts hosted checkout requests." : `Monime returned ${r.status}. Test keys can't open the card page — a live key is needed. Mobile money uses dial-to-pay instead.`,
        });
      } catch {
        checks.push({ id: "hosted", label: "Hosted checkout (VisaCard) available", status: "warn", detail: "Couldn't reach Monime." });
      }
      try {
        const r = await fetch("https://api.monime.io/v1/payment-codes?limit=1", { headers });
        checks.push({
          id: "ussd", label: "Dial-to-pay (AfriMoneySL / OrangeMoneySL) available",
          status: r.ok ? "pass" : "fail",
          detail: r.ok ? "Monime accepts payment-code requests." : `Monime returned ${r.status}.`,
        });
      } catch {
        checks.push({ id: "ussd", label: "Dial-to-pay available", status: "fail", detail: "Couldn't reach Monime." });
      }
    }

    const { data: hooks } = await admin
      .from("webhook_events").select("verified, applied, created_at").order("created_at", { ascending: false }).limit(20);
    const verified = (hooks ?? []).filter((h) => h.verified).length;
    checks.push({
      id: "callbacks", label: "Recent Monime callbacks received",
      status: (hooks ?? []).length === 0 ? "warn" : verified > 0 ? "pass" : "fail",
      detail: (hooks ?? []).length === 0 ? "No callbacks yet — place a real payment to confirm." : `${verified} of ${(hooks ?? []).length} recent callbacks passed signature check.`,
    });

    const { data: paid } = await admin
      .from("orders").select("id, delivery_code, paid_at").not("paid_at", "is", null).order("paid_at", { ascending: false }).limit(20);
    const missingCode = (paid ?? []).filter((o) => !o.delivery_code).length;
    checks.push({
      id: "codes", label: "Paid orders have delivery codes",
      status: (paid ?? []).length === 0 ? "warn" : missingCode === 0 ? "pass" : "fail",
      detail: (paid ?? []).length === 0 ? "No paid orders yet." : missingCode === 0 ? `All ${(paid ?? []).length} recent paid orders have a code.` : `${missingCode} paid orders are missing a code.`,
    });

    // Simulated flow: creates a clearly-labelled test order, marks it paid the
    // same way a confirmed payment does, checks a delivery code exists, then cancels it.
    if (data.simulate) {
      const { data: order, error } = await admin
        .from("orders")
        .insert({
          customer_name: "TEST — checklist", phone: "000000000", address: "Checklist simulation",
          items: [{ slug: "test", name: "Test item", qty: 1, price: 1 }], total_leones: 1,
          status: "awaiting_payment", admin_notes: "Automated payment checklist test",
        } as never)
        .select("id").single();
      if (error || !order) {
        checks.push({ id: "sim", label: "Simulated paid order", status: "fail", detail: error?.message ?? "Could not create test order." });
      } else {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await admin.from("orders").update({
          status: "paid", paid_at: new Date().toISOString(), delivery_code: code,
          rider_commission_pct: 15, rider_commission_leones: 0,
        } as never).eq("id", order.id);
        const { data: after } = await admin.from("orders").select("status, delivery_code").eq("id", order.id).single();
        const ok = after?.status === "paid" && /^\d{6}$/.test(after?.delivery_code ?? "");
        checks.push({
          id: "sim", label: "Simulated paid order + delivery code",
          status: ok ? "pass" : "fail",
          detail: ok ? `Test order flipped to paid and got a 6-digit delivery code. Test order cancelled.` : "Order did not reach paid with a code.",
        });
        await admin.from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never).eq("id", order.id);
      }
    }

    return { checks, liveMode: isLive };
  });
