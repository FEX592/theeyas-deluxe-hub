# Production Readiness Audit

**Checked:** 2026-10-10  
**Scope:** Existing linked Vercel project and Supabase project. Inspection was read-only except for the two changes listed below. No records were inserted, updated, or deleted.

## Changes made

### Vercel

Updated project `theeyas-deluxe-hub` to use:

- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Serverless function region: `fra1` (Frankfurt), nearer to the Supabase EU region

This config affects future builds; it does not itself deploy code or repair the current Git source.

### Supabase

Applied the additive/non-destructive migration `harden_public_function_search_path` to `theeya-deluxe` and recorded it in `supabase/migrations/20261010212008_harden_public_function_search_path.sql`. It fixes mutable `search_path` on `calculate_listing_assessment_total` and `recalculate_listing_assessment`. It changes no data, table, or policy.

## Current service status

### Supabase

- Project is `ACTIVE_HEALTHY` in `eu-west-1`.
- The public schema contains 19 tables; all have row-level security enabled.
- Seven tables have explicit policies; twelve RLS-enabled tables have no policies. Those tables are default-deny to the `anon` and `authenticated` roles. **Do not add broad policies just to make the current app appear connected.**
- Current policies restrict profiles, invites, listings, and orders to signed-in/admin actors; public reads are limited to categories and selected public assessment/evidence rows. Listings do not currently have an `anon` read policy.
- Supabase advisor still reports seven callable `SECURITY DEFINER` functions. The inspected admin snapshot/update functions check administrator status; customer order lookup is scoped to `auth.uid()`; invite redemption checks the signed-in user and invite. `is_admin()` and `registration_status()` return limited status information. Review whether each RPC must be directly executable by all authenticated users as the product evolves; do not revoke or broaden access without checking the app's intended flows.
- Supabase Auth's leaked-password protection is disabled. Enable it in the Supabase Auth password-security settings before allowing password-based customer accounts: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Performance advisories include 22 unindexed foreign keys, five RLS init-plan findings, six unused indexes, and one pair of overlapping listing policies. These are optimization work, not reasons to weaken security or block a small initial launch by themselves; review workload before changing indexes/policies.

### Vercel

- Project framework/build settings are now explicit, but the project still has `live: false`.
- The latest production deployment remains **ERROR**. Its exact build error is a path collision: `api/health.js` conflicts with `api/health.ts`. Keep one implementation (the prepared package keeps `api/health.ts`) and remove/rename the duplicate in the linked GitHub repo before the next Git deployment.
- Vercel project protection still has SSO enabled; it was not disabled. No broad-public access change was made.
- The linked GitHub repository could not be read or pushed from this environment. Therefore the conflicting tracked file could not be fixed in the remote branch and no new deployment was created.

## Live-launch blockers

These are code/operations blockers, not merely missing toggles:

1. **Durable persistence:** the uploaded app's `server/db.ts` reads/writes `.data/store.json`; it does not query or update the existing Supabase tables. Vercel's function filesystem is ephemeral and per-instance. Supabase environment variables alone do not make this app persistent. The current relational schema and source app model need an explicit, tested mapping before customer/order writes are directed to the live database.
2. **Authentication/authorization:** the app's email-only login/signup is simulated, and admin attribution accepts `x-actor-email`. Those are not production authentication/role checks. Add server-validated Supabase Auth sessions and enforce admin authorization before exposing customer/admin APIs.
3. **Build:** remove the duplicate health handler from the remote source, then rebuild and verify the deployment. The project settings change alone does not repair it.
4. **Live operations:** production configuration currently lacks the app's Paystack live keys, Brevo transactional-email credentials/sender configuration, canonical `APP_URL`, and a bootstrap secret. No secret values have been invented or copied from other services. Do not enable live charges until payment persistence, webhook idempotency, and fulfillment are tested against the durable database.
5. **Auth hardening:** enable leaked-password protection before production password signups.

The prepared Vercel source bundle includes a serverless Express adapter and the database migration, excludes `.data/store.json`, and builds cleanly. It is useful for a protected preview or continued implementation, but **should not accept real customers/payments until blockers 1–5 are resolved**.

## Verification completed

- `npm install --no-audit --no-fund` completed successfully after aligning `esbuild` with Vite 8's peer requirement.
- `npm run build` passed.
- `npm run lint` (`tsc --noEmit`) passed.
- Production Supabase advisor was rechecked after the migration. The mutable-search-path warning is cleared; the other findings above remain.
