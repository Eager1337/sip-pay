// Customer + admin notification helpers.
// WhatsApp messages are opened through wa.me deep links (no API key needed),
// and buyers get an in-browser notification when their delivery status moves.

export const ADMIN_WHATSAPP = "23273095177"; // 073 095 177 in international form
export const ADMIN_EMAIL = "ebeaver091@gmail.com";

export type NotifyOrder = {
  id: string;
  status: string;
  total_leones: number;
  delivery_fee_leones?: number | null;
  discount_leones?: number | null;
  items: Array<{ name: string; qty: number; price: number }>;
  customer_name?: string;
  phone?: string;
  address?: string;
  city?: string | null;
  district?: string | null;
  payment_method?: string | null;
  monime_transaction_id?: string | null;
  delivery_code?: string | null;
};

export const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  afrimoney: "AfriMoneySL",
  orange_money: "OrangeMoneySL",
  card: "VisaCard",
};

export const paymentLabel = (m?: string | null) =>
  (m && PAYMENT_LABELS[m]) || (m ? m.replace(/_/g, " ") : "—");

/** Normalise a Sierra Leone number to wa.me format (232XXXXXXXX). */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("232")) return digits;
  if (digits.startsWith("0")) return `232${digits.slice(1)}`;
  return digits.length === 8 ? `232${digits}` : digits;
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function orderMessage(o: NotifyOrder, opts?: { forAdmin?: boolean; origin?: string }): string {
  const short = o.id.slice(0, 8).toUpperCase();
  const lines = o.items.map((i) => `• ${i.name} × ${i.qty} — Le ${i.price * i.qty}`).join("\n");
  const link = `${opts?.origin ?? ""}/order/${o.id}`;
  const head = opts?.forAdmin
    ? `🧾 NEW KK DRINKS ORDER #${short}`
    : `Hi ${o.customer_name ?? "there"}, thank you for your KK Drinks order #${short}!`;
  return [
    head,
    "",
    lines,
    "",
    `Total: Le ${o.total_leones}`,
    `Payment: ${paymentLabel(o.payment_method)}`,
    `Status: ${o.status.replace(/_/g, " ")}`,
    o.delivery_code ? `Delivery code: ${o.delivery_code}` : "",
    o.customer_name && opts?.forAdmin ? `Customer: ${o.customer_name} (${o.phone ?? "—"})` : "",
    o.address ? `Address: ${[o.address, o.city, o.district].filter(Boolean).join(", ")}` : "",
    o.monime_transaction_id ? `Transaction: ${o.monime_transaction_id}` : "",
    "",
    `Track & receipt: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Open a WhatsApp draft in a new tab (used for admin + customer copies). */
export function openWhatsApp(phone: string, text: string) {
  if (typeof window === "undefined") return;
  window.open(whatsappUrl(phone, text), "_blank", "noopener,noreferrer");
}

export async function askBrowserNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function browserNotify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* ignore */
  }
}

export const DELIVERY_STATUS_TEXT: Record<string, string> = {
  awaiting_payment: "Waiting for your mobile money confirmation.",
  paid: "Payment confirmed — we're preparing your order.",
  cod_pending: "Order received. Our team will call to confirm delivery.",
  accepted: "A rider has accepted your order.",
  out_for_delivery: "Your rider is on the way. Have your delivery code ready.",
  delivered: "Delivered. Enjoy your drinks!",
  cancelled: "This order was cancelled.",
  payment_failed: "Payment did not go through. You can retry.",
  payment_cancelled: "Payment was cancelled.",
  payment_expired: "The payment window expired.",
};
