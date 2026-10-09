export const PAYMENT_STATUSES = Object.freeze([
  "uninitialized",
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "partially_refunded",
  "unknown",
]);

export const PAYMENT_CAPABILITIES = Object.freeze({
  INITIALIZE: "payment_initialization",
  VERIFY: "payment_verification",
  STATUS: "payment_status",
  WEBHOOKS: "webhooks",
  REDIRECT: "redirect_checkout",
  REFUNDS: "refunds",
  PARTIAL_REFUNDS: "partial_refunds",
});

export function normalizeCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return currency === "₦" || currency === "NGN" ? "NGN" : currency;
}

export function normalizeProviderStatus(providerStatus) {
  const status = String(providerStatus || "").toLowerCase();
  if (["success", "successful", "completed", "paid"].includes(status)) return "paid";
  if (["failed", "failure", "declined", "reversed"].includes(status)) return "failed";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["expired", "abandoned"].includes(status)) return "expired";
  if (["processing", "ongoing"].includes(status)) return "processing";
  if (["pending", "initiated", "queued"].includes(status)) return "pending";
  if (["refunded"].includes(status)) return "refunded";
  return "unknown";
}
