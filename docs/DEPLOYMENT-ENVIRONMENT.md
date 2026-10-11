# KK Drinks deployment environment

Configure these values in the Vercel project settings for the **KK Drinks** deployment. Add values through Vercel's Environment Variables UI; never commit actual secret values to GitHub.

## Required server-side values

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `SUPABASE_URL` | KK Drinks Supabase project URL | No, but must point to the KK Drinks project |
| `SUPABASE_PUBLISHABLE_KEY` | Public/client Supabase key used by server-side public lookups | No, publishable key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side database operations | **Yes — server only** |
| `ADMIN_PASSCODE` | Server-side passcode used by the current admin gate | **Yes — server only** |
| `MONIME_API_KEY` | Monime checkout/payment API | **Yes — server only** |
| `MONIME_SPACE_ID` | Monime space for KK Drinks payments | Treat as deployment configuration; verify it belongs to KK Drinks |

The service-role key bypasses Supabase Row Level Security. It must never use a `VITE_` prefix and must never be imported into browser-only modules.

## Before deploying

1. Verify the Supabase URL, service-role key, and publishable key all belong to the KK Drinks project, not HaamKay.
2. Set `ADMIN_PASSCODE` to a long, unique value. The application deliberately fails closed when it is missing; the old predictable fallback must not be restored.
3. Configure Monime credentials for the KK Drinks merchant/space. Do not enable real payments until payment callbacks/webhooks and order status verification have been tested.
4. Trigger a fresh deployment after environment changes.
5. Check Vercel build logs and run storefront, admin, checkout, and order tracking smoke tests.

## Release blockers that require verification

- Recent Vercel production deployments for the latest commits have reported `ERROR`. The available integration could list deployments but could not read build logs due to Vercel scope authorization. Do not treat the current source as production-verified until the build succeeds.
- The current admin UI stores the passcode in browser session storage after verification. Audit every privileged server function and require server-side authorization on each admin operation before using this as a production admin system.
- The current account order-history flow looks up orders by phone number alone. Replace this with verified customer authentication or an appropriate one-time verification flow before exposing full order history, addresses, or delivery codes publicly.
- The PWA service worker is a first pass. Test installation, offline fallback, cache updates, and ensure no personalized or authenticated response is cached.
- Capacitor Android/iOS packaging, signing, and device tests are not yet complete.
