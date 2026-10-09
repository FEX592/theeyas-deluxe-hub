# Initial owner setup

A new deployment keeps public registration closed until the owner is established.

Configure these **server-only** Vercel variables:

- `TDH_BOOTSTRAP_SECRET`: a high-entropy, one-time setup secret.
- `TDH_OWNER_EMAIL`: the owner email address.
- `TDH_OWNER_PASSWORD`: the owner password (at least 12 characters).

After applying the initial-owner migration, send one `POST` request to `/api/admin/bootstrap` with the secret in the `x-tdh-bootstrap-secret` header. The endpoint creates the configured, confirmed owner account atomically with the database bootstrap lock, consumes the setup opportunity permanently, and never returns the configured credentials.

Remove or rotate `TDH_BOOTSTRAP_SECRET` after the endpoint succeeds. If the database already has an administrator, the endpoint fails closed.
