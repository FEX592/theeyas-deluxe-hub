# THEEYA’S DELUXE HUB

Dark, authenticated marketplace for purchasing access to approved WhatsApp Groups and Channels.

## Stack

- React + Vite frontend
- Supabase Auth, Postgres, and Row Level Security
- Vercel serverless functions for Paystack initialization, verification, and account deletion
- Paystack checkout

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm build:static
```

## Deployment

Deploy this repository to Vercel. Vercel automatically detects the JavaScript functions in `api/`; no custom function runtime declaration is required. Add the environment variables listed in [`DEPLOYMENT.md`](./DEPLOYMENT.md), then run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.

The first successful registration becomes the initial administrator. Later administrator accounts are created through invite links from the Admin workspace. Normal customer sign-up remains available after the initial administrator exists.
