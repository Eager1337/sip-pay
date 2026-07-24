// Client-side downloadable HTML receipt. Opens as a standalone file the
// buyer can save as PDF via their browser's print dialog.
export type ReceiptOrder = {
  id: string;
  status: string;
  total_leones: number;
  delivery_fee_leones?: number | null;
  discount_leones?: number | null;
  items: Array<{ name: string; qty: number; price: number }>;
  customer_name: string;
  phone: string;
  address: string;
  city?: string | null;
  district?: string | null;
  payment_method: string | null;
  monime_transaction_id?: string | null;
  monime_order_number?: string | null;
  paid_at?: string | null;
  created_at: string;
  delivery_code?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function receiptHtml(o: ReceiptOrder): string {
  const subtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
  const shortId = o.id.slice(0, 8).toUpperCase();
  const method = (o.payment_method ?? "—").replace(/_/g, " ");
  const paidAt = o.paid_at ? new Date(o.paid_at).toLocaleString() : "—";
  const eta = o.paid_at
    ? new Date(new Date(o.paid_at).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
        weekday: "long", month: "short", day: "numeric",
      })
    : "within 24 hours of payment";
  const rows = o.items
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}</td><td class="c">${i.qty}</td><td class="r">Le ${i.price}</td><td class="r">Le ${i.price * i.qty}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>KK Drinks receipt · ${shortId}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;max-width:720px;margin:32px auto;padding:0 24px}
 h1{font-size:28px;margin:0 0 4px;color:#148C8C}
 .muted{color:#666;font-size:13px}
 .box{border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin:20px 0}
 table{width:100%;border-collapse:collapse;margin-top:8px}
 th,td{padding:8px 6px;border-bottom:1px solid #eee;font-size:14px;text-align:left}
 th{color:#666;font-weight:600;font-size:12px;text-transform:uppercase}
 td.c,th.c{text-align:center} td.r,th.r{text-align:right}
 .total{font-size:20px;font-weight:700;color:#148C8C}
 .badge{display:inline-block;background:#e6f7f5;color:#0f7a76;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
 .code{font-family:ui-monospace,Menlo,monospace;letter-spacing:.4em;font-size:24px;color:#B8860B}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;font-size:14px}
 .grid div span{color:#666;display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
 .footer{margin-top:32px;text-align:center;color:#999;font-size:12px}
 @media print{.noprint{display:none}}
</style></head><body>
 <div style="display:flex;justify-content:space-between;align-items:flex-start">
   <div><h1>KK Drinks</h1><div class="muted">Sierra Leone · NAFDAC &amp; SLSB approved</div></div>
   <div style="text-align:right"><div class="badge">Receipt</div><div class="muted" style="margin-top:6px">Issued ${new Date().toLocaleDateString()}</div></div>
 </div>

 <div class="box">
   <div class="grid">
     <div><span>Order number</span>#${shortId}</div>
     <div><span>Status</span>${esc(o.status.replace(/_/g, " "))}</div>
     <div><span>Transaction ID</span>${esc(o.monime_transaction_id ?? o.monime_order_number ?? "—")}</div>
     <div><span>Payment method</span>${esc(method)}</div>
     <div><span>Paid at</span>${esc(paidAt)}</div>
     <div><span>Estimated delivery</span>${esc(eta)}</div>
   </div>
 </div>

 <div class="box">
   <div class="grid">
     <div><span>Customer</span>${esc(o.customer_name)}</div>
     <div><span>Phone</span>${esc(o.phone)}</div>
     <div style="grid-column:1/-1"><span>Delivery address</span>${esc(o.address)}${o.city ? ", " + esc(o.city) : ""}${o.district ? ", " + esc(o.district) : ""}</div>
     ${o.delivery_code ? `<div style="grid-column:1/-1"><span>Delivery code</span><span class="code">${esc(o.delivery_code)}</span></div>` : ""}
   </div>
 </div>

 <div class="box">
   <table>
     <thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
     <tbody>${rows}</tbody>
   </table>
   <table style="margin-top:12px">
     <tr><td>Subtotal</td><td class="r">Le ${subtotal}</td></tr>
     ${o.delivery_fee_leones ? `<tr><td>Delivery fee</td><td class="r">Le ${o.delivery_fee_leones}</td></tr>` : ""}
     ${o.discount_leones ? `<tr><td>Discount</td><td class="r">− Le ${o.discount_leones}</td></tr>` : ""}
     <tr><td class="total">Amount paid</td><td class="r total">Le ${o.total_leones}</td></tr>
   </table>
 </div>

 <div class="noprint" style="text-align:center;margin:20px 0">
   <button onclick="window.print()" style="background:#148C8C;color:#fff;border:0;padding:10px 22px;border-radius:8px;font-weight:600;cursor:pointer">Save as PDF / Print</button>
 </div>

 <div class="footer">Thank you for choosing KK Drinks. Questions? kkfood866@gmail.com</div>
</body></html>`;
}

export function downloadReceipt(order: ReceiptOrder) {
  const html = receiptHtml(order);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `KKDrinks-receipt-${order.id.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
