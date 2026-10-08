# Deployment setup

## Vercel environment variables

Add these variables to the Vercel project in Preview and Production as needed:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Browser-safe Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by Paystack and account deletion handlers. Never expose this to the browser. |
| `PAYSTACK_SECRET_KEY` | Server-only Paystack secret key. |
| `PAYSTACK_PUBLIC_KEY` | Optional browser-safe Paystack public key for future client-side flows. |

The frontend also accepts the `VITE_` equivalents for the two Supabase public values and Paystack public key. The runtime config additionally accepts `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which are common in Vercel integrations. The `/api/config.js` function exposes only browser-safe values at runtime.

## Supabase setup

1. Open the Supabase SQL editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Authentication settings, configure the site URL and redirect URLs for the Vercel domain.
4. Decide whether email confirmation should be required. When it is enabled, the site tells new users to confirm before signing in.

The first user created after the schema is applied becomes an administrator. After that, new administrators must use an invite link created in the Admin workspace. The invite works for a new sign-up or an existing signed-in user.

## Paystack setup

Use the Vercel project URL as the callback origin. The site initializes payments through `/api/paystack/initialize`, redirects to Paystack, and verifies the returned reference through `/api/paystack/verify`. The order remains in a factual `processing` state until an administrator marks it `Ready` and attaches the access link.

For production, also configure Paystack webhooks if you want server-side verification independent of the return redirect. The current flow does not claim a payment is complete until Paystack verification succeeds.

## Vercel build

The repository is configured with `vercel.json`:

```text
Build command: pnpm build:static
Output directory: dist/public
```

The `api/` folder is deployed as Vercel Node functions. Do not add `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` to any `VITE_` variable.
