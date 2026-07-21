
This is a large batch. Before I build, two things need your call — they're blockers, not nitpicks.

## Blocker 1 — Admin password "Eagerbeaver123"

A shared hardcoded password in the frontend is unsafe: anyone who views the site's JavaScript can read it, and there's no way to revoke it or audit who did what. I won't ship that.

Two safe options that give you the same "only I get in" feel:
- **A. Keep the existing admin login** (email + password you already set), and I'll add a "Make me admin" one-click button that only works for the first person to click it. That's you. Done.
- **B. Add a server-side gate**: I store `ADMIN_PASSCODE` as a backend secret (you set the value — can be `Eagerbeaver123` if you insist), and a `/admin/login` page trades that passcode for an admin session cookie. Still not great (one shared secret, no audit), but at least the passcode never ships to the browser.

I'll do **A** unless you say otherwise.

## Blocker 2 — Emails

Order-paid / order-failed emails need a **sender domain you own** (e.g. `orders@kkdrinks.sl`). Gmail addresses can't be used as sender. Options:
- Give me a domain you own → I set up Lovable Emails, wire both templates to the webhook. Works within a day of DNS.
- Skip emails → I ship everything else and we do emails later.

## What I'll build (approve and I start)

### 1. Delivery-on-confirmation payment flow (escrow-style)

Order lifecycle becomes:
`awaiting_payment` → `paid_held` (customer paid via Monime, funds held) → `out_for_delivery` (rider accepted) → `delivered` (customer confirmed on their phone) → `released` (rider payout recorded).

- On payment success, we generate a **6-digit delivery code** and show it to the customer on `/order/$id`. They give it to the rider on handoff.
- Rider marks "delivered" in the rider app and enters the code. Only a matching code flips the order to `delivered`.
- Customer also gets a "Confirm received" button on `/order/$id` — either action confirms delivery; both must eventually happen for `released`.
- Rider commission: configurable % (default 15%) recorded on the order at delivery time; a `rider_payouts` table logs what each rider is owed.

Note: Monime charges the customer at checkout — funds sit in your Monime balance, not literally "escrowed". "Release" here means "your books show the rider is owed their cut". Actual rider payouts happen off-platform (or via a second Monime disbursement later — say the word).

### 2. Rider portal at `/delivery`

- Footer icon links to `/delivery`.
- Rider sign-up / sign-in (Supabase auth, separate `rider` role).
- **Pending orders** feed (all `paid_held`, nearest first if geolocation granted).
- **Accept order** → order locked to that rider, status `out_for_delivery`.
- **My deliveries** with customer name, phone, address, order items, total, and a map link.
- **Live location sharing**: while an order is active, the rider's browser posts their lat/lng every 15s to `rider_locations`; the customer's `/order/$id` shows the rider's live position on a map.
- **Complete delivery** form: enter the 6-digit code → order flips to `delivered`, commission recorded.

### 3. Customer confirmation on `/order/$id`

- Live status + delivery code (only visible to the buyer via order id in URL — no auth needed, code is the second factor).
- Rider's live location on a map once accepted.
- "Confirm I received my order" button.
- Wishlist button per item, reviews list.

### 4. Wishlist + reviews

- Wishlist: signed-in customers can heart drinks; heart button on every product tile and product page. `/wishlist` page lists saved drinks.
- Reviews: 1–5 stars + text per drink, one per user per drink. Shown on each drink page with average rating. Simple profanity filter, no moderation UI in this pass.

### 5. Landing-page redesign (banner as hero)

Replace the current legacy home with a real hero banner: large product-forward hero with rotating drink imagery, primary CTAs ("Shop now", "Track order"), quick category chips, "How it works" 3-step (order → pay with Orange/Afrimoney → rider delivers), featured drinks grid with ratings pulled from reviews, testimonials strip, wholesale CTA, and a delivery-tracking teaser. Sticky nav, mobile-friendly.

### 6. Admin at the bottom

- Route `/admin` (option A above): sign in with your existing admin email → dashboard.
- Adds to the existing orders table: **Riders** tab (list, deactivate, see payouts owed), **Reviews** tab (hide bad ones), **Wishlist stats**, **Payouts** ledger.
- Small "Admin" link in the footer (subtle).

### 7. Emails (only if you give me a domain)

- `order_paid` template: order id, items, total, delivery code, link to `/order/$id`.
- `order_failed` template: retry link.
- Sent from the Monime webhook after status flip, idempotent (one send per order per outcome).

## Schema changes

- `orders`: add `delivery_code text`, `rider_id uuid`, `accepted_at`, `out_for_delivery_at`, `customer_confirmed_at`, `rider_commission_pct numeric`, `rider_commission_leones int`.
- New `riders(user_id, display_name, phone, vehicle, active, created_at)`.
- New `rider_locations(rider_id, order_id, lat, lng, updated_at)` — realtime enabled.
- New `rider_payouts(rider_id, order_id, amount_leones, status, created_at)`.
- New `wishlist(user_id, drink_slug, created_at)`.
- New `reviews(user_id, drink_slug, rating, body, created_at)` — unique on (user_id, drink_slug).
- New `app_role` values: `rider` (in addition to existing `admin`).

## Reply with

1. Admin option **A** or **B** (and passcode if B).
2. Sender domain, or "skip emails".
3. Rider commission % (default 15%).

Then I build the whole thing in one pass.
