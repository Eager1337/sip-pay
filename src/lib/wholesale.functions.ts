// Wholesale lead submission — public server fn.
// Inserts a lead and emails ebeaver091@gmail.com via Resend when configured.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const NOTIFY_EMAIL = "ebeaver091@gmail.com";

const leadSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  business_name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  region: z.string().trim().max(80).optional().nullable(),
  estimated_quantity: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
});

export const submitWholesaleLead = createServerFn({ method: "POST" })
  .inputValidator((data) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: inserted, error } = await supabase
      .from("wholesale_leads")
      .insert({
        full_name: data.full_name,
        business_name: data.business_name ?? null,
        email: data.email,
        phone: data.phone,
        region: data.region ?? null,
        estimated_quantity: data.estimated_quantity ?? null,
        message: data.message ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[wholesale-lead] insert", error);
      throw new Error("Could not save lead");
    }

    // Log analytics
    await supabase.from("analytics_events").insert({
      event_type: "wholesale_form_submit",
      path: "/wholesale",
      metadata: { lead_id: inserted.id, region: data.region ?? null } as never,
    });

    // Best-effort email via Resend through the Lovable connector gateway.
    const lovableKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (lovableKey && resendKey) {
      try {
        const html = `
          <h2>New wholesale lead</h2>
          <p><b>Name:</b> ${esc(data.full_name)}</p>
          <p><b>Business:</b> ${esc(data.business_name ?? "-")}</p>
          <p><b>Email:</b> ${esc(data.email)}</p>
          <p><b>Phone:</b> ${esc(data.phone)}</p>
          <p><b>Region:</b> ${esc(data.region ?? "-")}</p>
          <p><b>Est. quantity:</b> ${esc(data.estimated_quantity ?? "-")}</p>
          <p><b>Message:</b><br/>${esc(data.message ?? "-").replace(/\n/g, "<br/>")}</p>
        `;
        const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL ?? "KK Drinks <onboarding@resend.dev>",
            to: [NOTIFY_EMAIL],
            reply_to: data.email,
            subject: `New wholesale lead — ${data.business_name ?? data.full_name}`,
            html,
          }),
        });
        if (!r.ok) console.warn("[wholesale-lead] resend status", r.status, await r.text());
      } catch (e) {
        console.warn("[wholesale-lead] email failed", e);
      }
    } else {
      console.info("[wholesale-lead] Resend not configured; skipping email");
    }

    return { ok: true, id: inserted.id };
  });

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
