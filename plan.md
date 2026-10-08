# THEEYA’S DELUXE HUB — implementation plan

## Product scope

Build a gated marketplace for discovering and purchasing access to WhatsApp Groups and Channels. Visitors must sign up or sign in before seeing the storefront. The first successful registration becomes the initial administrator. Later administrators can create shareable admin invite links that promote both newly registered users and existing users after they sign in.

The browser uses Supabase Auth and Supabase Postgres/RLS directly; this is application authentication, not Manus authentication. Paystack initialization and verification use Vercel serverless functions so the Paystack secret and Supabase service-role key never enter the browser bundle.

Customer-facing copy remains factual and concise, using the approved wording from the supplied brand board. No fabricated listings, counts, testimonials, urgency, or unsupported claims are added.

## Implementation approach

- React/Vite frontend in `client/src` with a single authenticated application shell and a separate admin workspace view.
- `client/src/lib/supabase.ts` loads browser-safe runtime configuration from `/api/config.js` with Vite environment fallback.
- `supabase/schema.sql` provides profiles, admin invites, listings, orders, triggers, RPCs, and RLS policies.
- `api/config.js`, `api/paystack/initialize.js`, `api/paystack/verify.js`, and `api/account/delete.js` are Vercel-compatible serverless handlers.
- Public data is read from Supabase. Admin CRUD is protected by database policies; the UI also hides admin navigation for non-admin roles.
- `client/public/` contains only the supplied brand assets and favicon used by the Vercel build.

## Project structure

- `client/src/App.tsx`: auth gate, public storefront, checkout, order tracking, admin workspace, account settings, and invite redemption.
- `client/src/index.css`: dark visual system, responsive layout, component states, and motion.
- `client/src/lib/supabase.ts`: runtime configuration and browser Supabase client factory.
- `client/src/lib/types.ts`: application row and profile types.
- `client/public/`: supplied brand assets and favicon.
- `api/`: Vercel serverless handlers for runtime config, Paystack, and account deletion.
- `supabase/schema.sql`: deployment migration for the application data model and RLS.
- `vercel.json`: Vercel build/output configuration.

## Design direction

### Design movement
Dark editorial commerce: a quiet, premium interface built from deep plum surfaces, warm gold accents, and deliberate typography rather than decorative AI-generated content.

### Core principles
1. **Factual first** — product data and status labels say only what the system knows.
2. **Quiet confidence** — spacing, contrast, and hierarchy create the premium feeling.
3. **Operational clarity** — admin actions, payment states, and invite states are easy to scan.
4. **Controlled access** — authentication and role visibility are part of the product, not an afterthought.

### Color philosophy
The dark plum base (#160d1b / #211326) makes the gold accent feel like a controlled signal for primary actions and approved brand moments. Orchid purple carries identity; muted lavender handles secondary information; off-white surfaces preserve readability without turning the experience into a generic white dashboard.

### Layout paradigm
Use a split editorial layout: a narrow utility rail for admin work, wide content stages for storefront and tables, and asymmetrical hero compositions. Avoid centered marketing grids as the default; use anchored columns and left-aligned reading lines.

### Signature elements
- A compact TDH crown mark and gold hairline eyebrow.
- Orchid-to-plum surface gradients with thin gold borders.
- Small status pills that map directly to system states (Published, Draft, Waiting for payment, Processing, Ready).

### Interaction philosophy
Every action has a visible state. Forms preserve administrator-entered copy exactly. Destructive actions are explicit and require a confirmation phrase. Invite creation immediately exposes a copyable link and the expiration date.

### Animation
Use short 160–220ms ease-out transitions for panel entry, hover lift, and status changes. Avoid looping or attention-seeking animation except a subtle loading shimmer/spinner during network work.

### Typography system
Use Plus Jakarta Sans for headings, navigation labels, and numeric values; use Inter for body copy, forms, tables, and status text. Use tighter letter spacing on display headings and generous tracking for eyebrow labels.

### Brand essence
**A factual marketplace for discovering and purchasing access to WhatsApp Groups and Channels.** Personality: considered, clear, dependable.

### Brand voice
Direct, modern, and human. Example lines: “Browse available communities.” and “Your order is being processed.” Avoid exaggerated claims and placeholder marketing text.

### Wordmark and signature color
Use a compact crowned `TDH` mark with a gold bridge accent, paired with the THEEYA’S / DELUXE HUB lockup. Signature brand color: **orchid plum #8D4A9A**, grounded by **deep plum #211326** and **warm gold #D6B36A**.

## Deployment assumptions

- Vercel provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and `VITE_PAYSTACK_PUBLIC_KEY` (or equivalent names documented in `DEPLOYMENT.md`).
- Supabase Auth email confirmation can remain enabled; the UI tells new users to check email when no session is returned.
- The first registered account is the initial admin. Subsequent admin creation is link-based and controlled by existing admins.
