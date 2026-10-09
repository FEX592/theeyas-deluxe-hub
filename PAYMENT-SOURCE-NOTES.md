# Payment integration source notes

The payment adapter and credential-storage implementation is based on these vendor references:

- Paystack Transactions API: https://paystack.com/docs/api/transaction/
  - Initialize and verify requests are server-side and authenticated with a secret key.
  - Transaction amounts are sent in the provider currency's subunit; for NGN the adapter uses kobo (100 per naira).
  - Verification responses include normalized status, reference, amount, currency, and payment timestamp; the server checks amount and currency before marking an order paid.
- Paystack Webhooks: https://paystack.com/docs/payments/webhooks/
  - `x-paystack-signature` is HMAC-SHA512 over the original raw request body, signed with the integration secret.
  - Paystack recommends acknowledging valid webhook requests with HTTP 200 and validating signature before processing.
- Supabase Vault: https://supabase.com/docs/guides/database/vault
  - `vault.create_secret(secret[, name, description])` stores encrypted credentials; `vault.update_secret(id, secret[, name, description])` replaces them.
  - `vault.decrypted_secrets` exposes decrypted values only at query time; permissions must be tightly restricted.

Implementation constraint: Paystack is the sole provider adapter included because it is the only real provider integration in the supplied project. No credentials are embedded, printed, or stored in frontend source. The migration is local and must not be applied to the connected production Supabase project without the user's explicit direction.