# Deployment setup

## Vercel environment variables

Add these variables to the Vercel project in Preview and Production as needed:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Browser-safe Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by payment and account API routes. Never expose this to the browser. |

The frontend also accepts `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Runtime config additionally accepts `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The `/api/config.js` function exposes only browser-safe values. Payment provider credentials are stored encrypted in Supabase Vault through Admin → Payments; do not add them to `VITE_` variables.

## Supabase setup

1. Open the Supabase SQL editor.
2. For a new database, run [`supabase/schema.sql`](./supabase/schema.sql). For the existing project that already has the app schema, do not rerun the base setup; review and apply [`supabase/migrations/20261008225000_payment_provider_architecture.sql`](./supabase/migrations/20261008225000_payment_provider_architecture.sql) only.
3. In Authentication settings, configure the site URL and redirect URLs for the Vercel domain.
4. Decide whether email confirmation should be required. When it is enabled, the site tells new users to confirm before signing in.
5. After deploying this source and applying the payment migration, sign in as an administrator, open **Admin → Payments**, configure the installed provider in **Test** mode, test the connection, and activate it. Configure and test Live separately before confirming Live activation.

The first user created after the schema is applied becomes an administrator. After that, new administrators must use an invite link created in the Admin workspace. The invite works for a new sign-up or an existing signed-in user.

## Payment setup

The marketplace calls `/api/payments/initialize` and `/api/payments/verify`. Only the registered Paystack adapter is included in this build; no other provider is claimed as supported. The adapter currently accepts NGN listings and uses Paystack-hosted checkout, server-side verification, and signed webhooks. Unsupported currencies fail closed without conversion.

Configure the Paystack webhook URL in the provider dashboard as `https://<your-production-domain>/api/payments/webhooks/paystack`. It validates the documented HMAC-SHA512 signature over the raw request and re-verifies the transaction server-side. A successful payment moves the order to `processing`; an administrator still reviews and fulfills the order. Historical transactions retain their provider and encrypted configuration version.

The former Vercel Paystack environment variables are not used by the new generic payment routes. Keep existing variables untouched until the updated source is deliberately deployed and verified; after rollout, remove obsolete provider keys from Vercel if they are no longer needed elsewhere.

## Vercel build

The repository is configured with `vercel.json`:

```text
Build command: pnpm build:static
Output directory: dist/public
```

The `api/` folder is deployed as Vercel Node functions. Do not add `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` to any `VITE_` variable.
