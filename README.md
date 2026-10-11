# Theeya's Deluxe Hub

Vite + React storefront with an Express API, Paystack payments, and Brevo email integration.

## Vercel deployment package

This repository is configured for Vercel's Vite frontend build and a catch-all Node.js function for the existing Express API. The API routes are preserved under `/api/*`.

The connected Vercel project has been configured with Vite build settings and a Frankfurt function region, and the linked Supabase project received a non-destructive function hardening migration. **The project is not yet live:** its latest production deployment failed due to duplicate `api/health.js` and `api/health.ts` paths in the linked Git source. See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for the audited state and remaining launch blockers.

### Deploy

1. Push this project to a Git provider and import it into Vercel (or use the existing linked project `theeyas-deluxe-hub`).
2. Set the root directory to the repository root. Vercel uses `npm install` and `npm run build`; output is `dist`.
3. Add the environment variables in the Vercel project settings (see `.env.example`). Do not commit `.env` files or paste secret keys into client-side `VITE_*` variables.
4. Set `APP_URL` to the deployed HTTPS origin and configure the Paystack webhook URL as `https://<your-domain>/api/payments/webhooks/paystack`.
5. Deploy first with Paystack test credentials. Verify `/api/health`, owner setup, a test checkout, payment callback/webhook, and transactional email before switching Paystack to live credentials.

Vercel project settings are managed in the Vercel dashboard. Supabase project URL and publishable key are available from **Project Settings → API Keys**. If the app's server-side database integration is implemented, set the service-role/secret key only as a Vercel server environment variable, never as a `VITE_*` variable or in source control.

## Important production limitation: persistence

**This source is not yet production-ready for real customer/order data on Vercel.** `server/db.ts` reads and writes `.data/store.json`, which is local disk. Vercel Functions have ephemeral, per-instance filesystems; writes can disappear and concurrent function instances do not share this data. Although the project contains a Supabase client and the existing Supabase project has a relational storefront schema, the current `Database` class does not read or write those Supabase tables. Setting Supabase environment variables alone does not fix persistence.

The current login/signup flow is an email-only simulation, and admin route attribution can be supplied through an `x-actor-email` header. It is not real authentication or authorization. Add and verify Supabase Auth/session validation and server-side role checks before exposing customer accounts or admin functions publicly.

Before accepting real signups, orders, admin changes, or payments, replace the local JSON persistence with a tested adapter for the existing Supabase schema (or another durable database), verify access-control policies, and move background email dispatch to a durable queue/cron/worker. The Vercel API adapter intentionally does not start the existing interval-based outbox worker inside a serverless function.

The uploaded archive included `.data/store.json` with an already-claimed owner profile and store state. That runtime file is excluded from deployment/source control by `.gitignore`; the package uses the app's built-in starter data instead. Review any private data separately before importing it into a database.

## Required environment variables

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: currently used only to report Supabase connection configuration; database persistence is not implemented. Keep the service-role key server-side only.
- `APP_URL`: canonical public origin used in generated customer links.
- `TDH_OWNER_BOOTSTRAP_SECRET`: strongly recommended before deploying; protects the one-time owner claim.
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`: use test keys for test mode; live keys only after end-to-end verification.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO`: configure a verified sender for real transactional delivery.

The app can run with missing payment/email keys in simulated/deferred mode, but this is not a live-commerce setup.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The local Express/Vite development server listens on port 3000 by default. `npm run build` builds the static client; `npm run lint` runs the TypeScript compiler check.

## Durable persistence fix (2026-10-10)

The server-side store now uses the Supabase `tdh_app_state` table when both
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Writes are
performed before the request continues, so Vercel instances no longer rely on
ephemeral function storage. The table is RLS-enabled and direct access for
`anon` and `authenticated` roles is revoked; only the server service role may
read or write it.

The local `.data/store.json` fallback remains available for local development
only. It is disabled in production/Vercel when Supabase service-role
configuration is missing, preventing silent loss of customer or order data.

**Authentication is still a separate launch blocker:** the existing UI is an
email-only simulation and must be migrated to Supabase Auth sessions before
public customer/admin access or live payments are enabled.

## First-party authentication (2026-10-11)

The site now uses its own server-side authentication system; it does not use a third-party auth provider.

- Passwords are hashed with Node.js `scrypt` and never stored in plaintext.
- Sessions are random, hashed tokens stored in `tdh_auth_sessions` and sent as `HttpOnly` cookies.
- `tdh_auth_users` stores the account email, display name, role, and password hash.
- The first account created when no `owner` or `admin` exists becomes the store owner and receives admin-panel access.
- All later signups are customer accounts.
- All non-auth pages redirect to `/login` when no session exists.
- All non-auth API endpoints return `401` without a valid session.
- Admin APIs additionally require an `admin` or `owner` session role.

The linked Vercel-Supabase integration supplies the server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables automatically. No API keys need to be copied or pasted manually. Keep the service-role key server-only and never expose it through a `VITE_*` variable. Apply the included `add_first_party_auth` migration before the first signup; it has already been applied to the connected Supabase project used during this build.
