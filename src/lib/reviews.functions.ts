// Wishlist and reviews server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* --------- Reviews (public read, auth write) --------- */

export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ drink_slug: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, body, author_name, created_at")
      .eq("drink_slug", data.drink_slug)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });

export const addReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    drink_slug: z.string().min(1).max(60),
    rating: z.number().int().min(1).max(5),
    body: z.string().min(3).max(1000),
    author_name: z.string().min(1).max(80),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").insert({
      user_id: context.userId,
      drink_slug: data.drink_slug,
      rating: data.rating,
      body: data.body,
      author_name: data.author_name,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------- Wishlist --------- */

export const getWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("wishlist")
      .select("drink_slug, created_at")
      .eq("user_id", context.userId);
    return data ?? [];
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ drink_slug: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("wishlist")
      .select("id")
      .eq("user_id", context.userId)
      .eq("drink_slug", data.drink_slug)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from("wishlist").delete().eq("id", existing.id);
      return { on: false };
    }
    await supabaseAdmin
      .from("wishlist")
      .insert({ user_id: context.userId, drink_slug: data.drink_slug } as never);
    return { on: true };
  });
