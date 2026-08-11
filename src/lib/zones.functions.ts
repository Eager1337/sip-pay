// Freetown delivery zones — public read for checkout, passcode-gated admin CRUD.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { checkAdminPasscode } from "./admin-gate.functions";

export type DeliveryZone = {
  id: string;
  name: string;
  areas: string[];
  fee_leones: number;
  eta_min_minutes: number;
  eta_max_minutes: number;
  sort_order: number;
  active: boolean;
};

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
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

export const listDeliveryZones = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, areas, fee_leones, eta_min_minutes, eta_max_minutes, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[zones] list", error.message);
    return { zones: [] as DeliveryZone[] };
  }
  return { zones: (data ?? []) as DeliveryZone[] };
});

/* -------------------- Admin -------------------- */

async function admin(passcode: string | undefined) {
  if (!checkAdminPasscode(passcode)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listZonesAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { data: rows, error } = await db
      .from("delivery_zones")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { zones: (rows ?? []) as DeliveryZone[] };
  });

const zoneSchema = z.object({
  passcode: z.string().min(1).max(200),
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(80),
  areas: z.array(z.string().trim().min(1).max(60)).max(60),
  fee_leones: z.number().int().min(0).max(100000),
  eta_min_minutes: z.number().int().min(5).max(2880),
  eta_max_minutes: z.number().int().min(5).max(2880),
  sort_order: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export const upsertZone = createServerFn({ method: "POST" })
  .inputValidator((d) => zoneSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const payload = {
      name: data.name,
      areas: data.areas,
      fee_leones: data.fee_leones,
      eta_min_minutes: data.eta_min_minutes,
      eta_max_minutes: Math.max(data.eta_max_minutes, data.eta_min_minutes),
      sort_order: data.sort_order,
      active: data.active,
    };
    const table = db.from("delivery_zones") as never as {
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
    const { error } = data.id
      ? await table.update(payload).eq("id", data.id)
      : await table.insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteZone = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passcode: z.string().min(1).max(200), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.passcode);
    const { error } = await db.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
