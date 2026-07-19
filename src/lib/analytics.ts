import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const SESSION_KEY = "kk_session_id";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type AnalyticsEvent =
  | "page_view"
  | "add_to_cart"
  | "chat_open"
  | "store_form_submit"
  | "wholesale_form_submit"
  | "checkout_started"
  | "checkout_completed";

export async function track(
  event_type: AnalyticsEvent,
  metadata: Record<string, unknown> = {},
  path?: string,
) {
  if (typeof window === "undefined") return;
  try {
    const p = path ?? window.location.pathname;
    await supabase.from("analytics_events").insert({
      event_type,
      path: p,
      session_id: sessionId(),
      metadata: metadata as Database["public"]["Tables"]["analytics_events"]["Insert"]["metadata"],
    });
  } catch (e) {
    console.debug("[analytics] track failed", e);
  }
}
