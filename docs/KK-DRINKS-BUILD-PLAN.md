# KK Drinks — Website + Mobile App Build Plan

## Project boundary

- Product name: **KK Drinks**
- Repository: `Eager1337/sip-pay`
- Production branch: `main`
- Preserve the existing KK Drinks work and published Git history; make incremental commits only.
- This is an independent KK Drinks product. Never reuse HaamKay customer accounts, products, orders, storage buckets, payment credentials, database rows, or branding assets.
- Keep KK Drinks' orange-label beverage identity and its own product photography. Do not substitute fashion products or HaamKay assets.

## Current repository baseline

The repository is a React 19 / Vite 8 / TanStack Start application using Bun, Tailwind CSS v4, shadcn/ui, and Supabase. Existing route coverage includes the storefront, product/category pages, wholesale, checkout, order details, tracking, account, support, delivery/rider pages, and a multi-section admin area. Treat these as existing work to audit and improve, not pages to discard.

## Target outcome

A polished, production-oriented KK Drinks storefront and companion mobile app, sharing the KK Drinks backend while keeping customer data and administrative operations isolated from HaamKay.

## Workstreams

### 1. Baseline audit and safety
- Map all public, customer, admin, and rider routes to their actual components and data sources.
- Run build and lint checks; record failures before making broad UI changes.
- Verify the configured Supabase project is KK Drinks-only before using production data.
- Check Row Level Security (RLS), server-side authorization, webhook verification, and admin session/passcode handling.
- Keep service-role keys, Monime secrets, webhook secrets, and email credentials server-side only. Never commit real secrets.
- Confirm the public `.env` contains publishable client configuration only; rotate any credential found to be secret.

### 2. Storefront and visual system
- Retain the KK Drinks orange-label identity; refine typography, spacing, responsive navigation, cards, buttons, loading/empty/error states, and accessibility.
- Home page: hero, featured drinks, category navigation, promotions, trust/delivery information, and clear calls to action.
- Catalog: Mango, Orange, Mixed Fruit, Yogurt, Apple, Tamarind, Water, plus admin-managed categories.
- Product details: accurate product imagery, variants/pack sizes where configured, stock state, price, quantity controls, related products, and add-to-cart.
- Search, sorting, filters, cart persistence, favourites/wishlist, and responsive desktop/tablet/mobile layouts.
- Do not invent ingredients, nutrition, health benefits, certifications, age restrictions, or product claims; use verified business data.

### 3. Checkout, payments, and fulfilment
- Persist customer contact and delivery details, cart line items, totals, payment state, and order status in the KK Drinks database.
- Support the configured Monime checkout flow and only show Orange Money, Afrimoney, or Visa where the live payment configuration actually supports them.
- Verify payment status on the server/webhook; never trust a client redirect as proof of payment.
- Include clear pending/failed/success states, order confirmation, order history, tracking, delivery zones/fees, and rider workflow.
- Wholesale enquiries/orders must remain distinct from ordinary retail orders where the current schema supports that distinction.

### 4. Admin and operations
- Secure admin sign-in and server-side authorization for every privileged operation.
- Dashboard KPIs based on real database data; orders, customers, products, categories, inventory, wholesale, riders, delivery zones, reviews, wishlists, payouts, audit logs, webhooks, content, and settings.
- Media gallery: upload, preview, edit metadata, organise, and reuse image/video assets; validate file type/size and store files in a KK Drinks-owned bucket.
- Homepage content, promotions, product visibility, stock, and store theme/settings managed without code edits.
- Useful search, filters, pagination, empty/error states, and confirmation for destructive actions.

### 5. Mobile application
- First deliver a responsive installable PWA with app manifest, icons, offline-safe shell, and install instructions.
- Then add/verify Capacitor for Android and iOS, with app-specific splash screen, status-bar handling, deep links, and native-safe navigation.
- Reuse the KK Drinks backend and authentication securely; the app and website must show the same KK Drinks products, stock, orders, and settings.
- Never ship service-role or payment secrets in the app bundle.
- Build and test Android artifacts before claiming an APK is ready; iOS release requires Apple signing/build access.

### 6. Quality and release
- Test key journeys: browse/search, product details, cart, checkout, payment callback, order tracking, account, admin product/media updates, and rider delivery.
- Test phone, tablet, desktop, slow network, and failed API/payment cases.
- Run lint/build and resolve regressions before deploying.
- Confirm Vercel project/production domain is connected to this repository and correct branch.
- Document required environment variables and release steps without documenting secret values.

## Acceptance checklist

- [ ] No HaamKay branding or business data in KK Drinks.
- [ ] Existing routes work and have meaningful loading, empty, and error states.
- [ ] Product and media changes in admin appear on storefront and app.
- [ ] Checkout records correct order totals and delivery details.
- [ ] Payment success is confirmed server-side.
- [ ] Customer records and orders are access-controlled.
- [ ] Admin actions are authorized server-side and audited where appropriate.
- [ ] Mobile layout and installable PWA verified.
- [ ] Android app build tested; iOS signing/release requirements documented.
- [ ] Production build, lint, and smoke tests pass.

## Immediate next steps

1. Inventory every route, shared component, database migration, server function, and payment path.
2. Establish a baseline build/lint result and verify the Supabase project boundary.
3. Fix high-risk security/data-isolation issues first.
4. Implement the visual and customer-journey improvements in small, reviewable commits.
5. Add and verify PWA/Capacitor packaging after the shared customer flows are stable.
