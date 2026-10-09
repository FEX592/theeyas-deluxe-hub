# THEEYA’S DELUXE HUB

Dark, authenticated marketplace for purchasing access to approved WhatsApp Groups and Channels.

## Stack

- React + Vite frontend
- Supabase Auth, Postgres, and Row Level Security
- Vercel serverless functions for payment processing and account operations
- Provider registry and normalized payment service; Paystack is the only installed adapter currently

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm build:static
```

## Deployment

Deploy this repository to Vercel. Vercel automatically detects the JavaScript functions in `api/`; no custom function runtime declaration is required. Add the server and browser-safe variables listed in [`DEPLOYMENT.md`](./DEPLOYMENT.md). For a new database, run [`supabase/schema.sql`](./supabase/schema.sql), then the payment migration. For the existing database that already has the base schema, apply only the migration in `supabase/migrations/` after reviewing it.

The first successful registration becomes the initial administrator. Later administrator accounts are created through invite links from the Admin workspace. Normal customer sign-up remains available after the initial administrator exists.

## Payments

Checkout calls the generic `/api/payments/initialize` and `/api/payments/verify` routes. Provider-specific requests and webhook verification stay inside registered adapters. The Admin workspace’s **Payments** section stores credentials in Supabase Vault, requires a connection test before activation, and affects new checkouts only. The current code has a real Paystack adapter; other providers are not offered until their adapters are implemented. Successful payment moves an order to processing for admin review and does not automatically reveal access links.
