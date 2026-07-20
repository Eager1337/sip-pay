This is a large batch — I'll ship it in one pass, in the priority order you gave. One blocker up front on emails, then the plan.

## Heads-up on emails

Sending email requires a **domain you own** as the sender (e.g. `notify@kkdrinks.sl`). `ebeaver091@gmail.com` is the *recipient* address — Gmail addresses can't be used as a sender-from because Google won't let anyone else send as `@gmail.com`.

Two options:
- **You provide a domain you own** (any domain — even one you just bought). I'll wire it up so paid/failed emails send from something like `orders@yourdomain.com` and land in your Gmail inbox and your customers'.
- **Skip emails for now** — I'll build everything else and we add emails later when a domain is ready.

I'll build slices 1–3 either way. Tell me your domain (or say "skip emails") after approving.

## 1. Order status page + hardened webhook

- New route `/order/$id` — reads the order, polls status every 3s until `paid`/`payment_failed`/`payment_cancelled`, shows itemized receipt, customer info, mobile-money provider, timestamps.
- Monime redirects `successUrl` → `/order/{id}?paid=1` (replaces the current homepage banner).
- **Webhook hardening** (`/api/public/webhooks/monime`):
  - HMAC-SHA256 signature verification with timing-safe compare against `MONIME_WEBHOOK_SECRET` and the raw body.
  - Idempotency: dedupe by `monime_payment_id` — if it already matches, return 200 without re-updating (prevents double-mark-paid).
  - New `webhook_events` table logs every delivery (event_id, payload, verified, applied) so replays are visible.

## 2. Admin orders dashboard

- New `/admin/orders` route under `_authenticated`, gated by `has_role(uid, 'admin')`.
- Server function `listOrders({ search, status, from, to, page })` — searches name/phone/id, filters by status, paginates 25/page.
- Row actions: **Mark paid**, **Mark failed**, **Mark delivered**, **Cancel**, **Add admin note** — all through a `updateOrderStatus` server fn that verifies admin role and writes an `order_events` audit trail.
- Order detail drawer shows full items JSON, webhook history for that order, and Monime payment id.

## 3. Stock + quantity limits + cart redesign

- Extend `DRINKS` with `stock` (number, nullable = unlimited) and `maxPerOrder` (default 24).
- Server-side validation in `createCheckoutSession`: rejects items over stock or `maxPerOrder`, returns per-item error so the UI can highlight the offending line.
- **Cart drawer** (right-side slide-over) opened by a cart icon in the top nav — quick view, quantity steppers, subtotal, "Checkout" CTA. Persists in `localStorage` so it survives navigation.
- **/checkout page** — full page with review + delivery details + payment method radio (Orange Money · Afrimoney · Cash on delivery) → Monime redirect.
- Remove `OrderDialog` usage from product pages; product tiles get an "Add to cart" that pops a toast + updates the drawer badge.

## 4. Emails (only if you give me a domain)

- Scaffold Lovable Emails with your sender domain.
- Two app-email templates: **order_paid** and **order_failed**, sent from the webhook after the status flips (idempotent — only sends once per order).
- Emails include order id, items, total, and a link to `/order/{id}`.

## More features / polish

Since you said "more beautiful, more features, more pages than Amazon" — I'll also add, in this pass:
- **Top nav** with cart icon + item badge, sticky, mobile drawer.
- **Product detail pages** get related-drinks carousel + reviews section (client-only, seeded).
- **/track** — quick "look up my order by phone + order id" (no account needed).
- **Better empty states, skeletons, and toasts** throughout.

Deferred (say the word and I'll add): customer accounts / order history under login, wishlist, promo codes, delivery zones with dynamic fees, bundle deals, referral program, review moderation. These are meaningful and each deserves its own pass — happy to do them next.

## Technical notes

- Migration: `orders` gains `admin_notes text`, `delivered_at timestamptz`, `cancelled_at timestamptz`; new `order_events(order_id, event_type, meta, created_at, actor)` and `webhook_events(id primary key = monime event id, order_id, verified bool, payload jsonb, created_at)` tables with RLS (admins read, service_role writes).
- All admin server fns use `requireSupabaseAuth` + `has_role` check before loading `supabaseAdmin`.
- Cart state: Zustand store persisted to `localStorage` — smaller than context+reducer, survives refresh.
- Order status polling: TanStack Query with `refetchInterval` that stops once terminal status hit.
- Webhook signature: Monime sends `Monime-Signature: t=<ts>,v1=<hex>` — I'll parse that format and fall back to plain hex if the shape differs, since Monime's docs on this vary.

Approve and I'll build. Reply with your sending domain (or "skip emails") in the same message and I'll wire that too.