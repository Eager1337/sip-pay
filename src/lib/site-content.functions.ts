// Site content CMS — public read (anon) + passcode-gated admin write/upload.
// Falls back to built-in defaults when the table/bucket isn't available yet
// (e.g. before the site_content migration is applied), so the landing page
// always renders.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { checkAdminPasscode } from "./admin-gate.functions";

export const DEFAULT_CONTENT: Record<string, string> = {
  hero_media_url: "",
  hero_media_type: "image",
  hero_headline: "",
  hero_subhead: "",
  hero_cta_label: "The Drinks",
  hero_cta_link: "/store",
  marquee_heading: "Fresh from our feed.",
  final_cta_heading: "Until your next sip.",
  final_cta_text: "Stock up on KK today. Pay on delivery anywhere in Sierra Leone — every bottle just Le 10.",
};

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public read of all editable site content. Always returns a full map. */
export const getSiteContent = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return { content: DEFAULT_CONTENT };
    try {
      const sb = publicClient();
      const { data, error } = await (sb as any).from("site_content").select("key, value");
      if (error) return { content: DEFAULT_CONTENT };
      const content = { ...DEFAULT_CONTENT };
      for (const r of (data ?? []) as Array<{ key: string; value: string | null }>) {
        if (r.value) content[r.key] = r.value;
      }
      return { content };
    } catch {
      return { content: DEFAULT_CONTENT };
    }
  });

async function admin(passcode: string) {
  if (!checkAdminPasscode(passcode)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listSiteContentAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: rows, error } = await (db as any).from("site_content").select("key, value, type").order("key");
    if (error) throw new Error(error.message);
    // Merge defaults so the admin UI always shows every field even pre-migration.
    const map = { ...DEFAULT_CONTENT };
    for (const r of (rows ?? []) as Array<{ key: string; value: string | null }>) {
      if (typeof r.value === "string") map[r.key] = r.value;
    }
    return { content: map };
  });

const updateSchema = z.object({
  passcode: z.string().min(1).max(200),
  key: z.string().min(1).max(60),
  value: z.string().max(100000),
});

export const updateSiteContent = createServerFn({ method: "POST" })
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { error } = await (db as any).from("site_content")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Upload a media file (base64 data URL) to the site-media bucket and return
 * its public URL. Passcode-gated; uses the service-role client.
 */
const uploadSchema = z.object({
  passcode: z.string().min(1).max(200),
  fileName: z.string().min(1).max(120),
  dataUrl: z.string().min(20).max(20_000_000), // ~15MB after base64 inflation cap
});

export const uploadSiteMedia = createServerFn({ method: "POST" })
  .inputValidator((d) => uploadSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const m = data.dataUrl.match(/^data:([\w/+.-]+);base64,(.*)$/s);
    if (!m) throw new Error("Invalid file data.");
    const mimeType = m[1];
    const bytes = Buffer.from(m[2], "base64");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `cms/${Date.now()}-${safeName}`;
    const { error } = await db.storage.from("site-media").upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const pub = db.storage.from("site-media").getPublicUrl(path);
    return { ok: true as const, url: pub.data.publicUrl };
  });
