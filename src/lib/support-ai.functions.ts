// Customer order-help assistant. Optionally looks up one order, but only when
// the caller supplies both the order number and the phone used on it.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const askOrderHelp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      issue: z.string().trim().min(5).max(1500),
      order_ref: z.string().trim().max(40).optional().default(""),
      phone: z.string().trim().max(20).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { answer: "Our help assistant is offline. Please call 073095177." };

    let orderInfo = "No order details provided.";
    const ref = data.order_ref.replace(/^#/, "").toLowerCase();
    const digits = data.phone.replace(/\D/g, "").slice(-8);
    if (ref.length >= 6 && digits.length >= 7) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows } = await supabaseAdmin
        .from("orders")
        .select("id, phone, status, payment_method, total_leones, created_at, paid_at, delivered_at, rider_id, monime_ussd_code")
        .order("created_at", { ascending: false })
        .limit(500);
      const match = (rows ?? []).find(
        (o) => String(o.id).toLowerCase().startsWith(ref) && String(o.phone ?? "").replace(/\D/g, "").endsWith(digits),
      );
      orderInfo = match
        ? JSON.stringify({
            order: String(match.id).slice(0, 8).toUpperCase(), status: match.status, payment: match.payment_method,
            total_leones: match.total_leones, placed: match.created_at, paid: match.paid_at,
            delivered: match.delivered_at, rider_assigned: !!match.rider_id, dial_code: match.monime_ussd_code,
          })
        : "No order matched that number and phone.";
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are KK Drinks customer support in Freetown, Sierra Leone. Give short, friendly, numbered next steps. Facts: payment methods are Cash on delivery, AfriMoneySL (dial *161#, pay to 033695803), OrangeMoneySL (dial #144#, pay to 073095177), VisaCard. Orders turn Paid automatically once payment is confirmed; the customer then gets a 6-digit delivery code and must only give it to the rider on arrival. Track orders at /track or the order page. Support WhatsApp/phone: 073095177, email ebeaver091@gmail.com. Never invent order facts beyond the ORDER data. Never ask for PINs.\n\nORDER: " +
              orderInfo,
          },
          { role: "user", content: data.issue },
        ],
      }),
    });
    if (res.status === 429) return { answer: "Lots of people are asking right now — please try again in a minute." };
    if (res.status === 402) return { answer: "The help assistant is unavailable. Please WhatsApp 073095177." };
    if (!res.ok) return { answer: "Sorry, I couldn't answer just now. Please WhatsApp 073095177." };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { answer: json.choices?.[0]?.message?.content ?? "Please WhatsApp 073095177 for help." };
  });
