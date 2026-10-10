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
