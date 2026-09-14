<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Base44 dev environment notes

## Stack
- **TanStack Start** (Vite 8 + Nitro SSR) app, package manager is **Bun** (`bun.lock`).
- Backend is a **hosted Supabase** project (project id in `.env`). No local DB — all data is remote.
- shadcn/ui (new-york) + Tailwind v4. React 19.

## Running here
- `docker compose -f docker-compose.base44.yml up -d` — runs `bun install` then `bun run dev` (Vite dev server with live reload) on port 3000, bind-mounted at `/app`.
- The repo's committed `.env` holds the **publishable** Supabase keys (safe to expose) and is loaded both by Vite (client `import.meta.env`) and as a compose `env_file` (SSR `process.env`).
- `vite.config.ts` sets `server.allowedHosts: true` because the preview is served through a proxy hostname that changes per environment.

## Secrets (external services — NOT in the repo)
The app boots and renders the storefront with only the publishable keys, but these are needed for full functionality (checkout, admin, delivery, payments). They live in `/run/base44/app.env` (platform-managed), wired as the last `env_file` in compose:
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for server-side order/admin/delivery writes.
- `MONIME_API_KEY`, `MONIME_SPACE_ID` — create Monime payment sessions at checkout.
- `MONIME_WEBHOOK_SECRET` — verifies the `/api/public/webhooks/monime` payment callback.
- `ADMIN_PASSCODE` — gates `/admin` server functions.
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (optional) — transactional emails.

## Verifying it works
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` must return 200 (Vite blocks unknown hosts without `allowedHosts`).
- The home route (`src/routes/index.tsx`) is `ssr: false` — it renders client-side via `src/legacy-app.tsx` (a `react-router-dom` BrowserRouter shell).
