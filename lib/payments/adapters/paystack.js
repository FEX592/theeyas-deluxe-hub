import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeCurrency, normalizeProviderStatus, PAYMENT_CAPABILITIES } from "../types.js";

const API = "https://api.paystack.co";
const SECRET_PATTERN = /^sk_(test|live)_[A-Za-z0-9]+$/;

function assertSecret(credentials) {
  const secretKey = String(credentials?.secretKey || "").trim();
  if (!SECRET_PATTERN.test(secretKey) || secretKey.length > 256) throw new Error("Enter a valid Paystack secret key.");
  return secretKey;
}

function minorAmountToMajor(amount, currency) {
  if (amount === null || amount === undefined || amount === "") return null;
  if (!Number.isFinite(Number(amount))) return null;
  // Paystack represents NGN amounts in kobo (100 kobo = 1 naira).
  if (currency === "NGN") return Number(amount) / 100;
  return null;
}

function safeProviderError(payload, fallback) {
  const message = String(payload?.message || "").toLowerCase();
  if (message.includes("invalid key") || message.includes("authorization")) return "The payment provider rejected its configured credentials.";
  if (message.includes("currency")) return "The payment provider does not accept this order currency.";
  return fallback.replaceAll("Paystack", "the payment provider");
}

export const paystackAdapter = Object.freeze({
  key: "paystack",
  name: "Paystack",
  version: "1",
  capabilities: [
    PAYMENT_CAPABILITIES.INITIALIZE,
    PAYMENT_CAPABILITIES.VERIFY,
    PAYMENT_CAPABILITIES.STATUS,
    PAYMENT_CAPABILITIES.WEBHOOKS,
    PAYMENT_CAPABILITIES.REDIRECT,
  ],
  webhookSignatureHeader: "x-paystack-signature",
  parseWebhookEvent(rawBody) {
    const payload = JSON.parse(rawBody.toString("utf8"));
    const data = payload?.data || {};
    const eventType = String(payload?.event || "unknown");
    const reference = String(data.reference || "");
    if (eventType !== "charge.success" || !reference) return { ignored: true, eventType };
    const providerTransactionId = data.id == null ? null : String(data.id);
    return {
      ignored: false,
      eventType,
      reference,
      providerTransactionId,
      eventId: `${eventType}:${providerTransactionId || reference}`,
    };
  },
  configurationSchema: [
    { key: "secretKey", label: "Secret key", type: "secret", required: true, help: "Stored encrypted in Supabase Vault. Never sent back to the browser." },
  ],
  supportedCurrencies: ["NGN"],
  validateCredentials(credentials, environment) {
    const secretKey = assertSecret(credentials);
    const keyEnvironment = secretKey.startsWith("sk_live_") ? "live" : "test";
    if (keyEnvironment !== environment) throw new Error(`The configured Paystack key is a ${keyEnvironment} key, not a ${environment} key.`);
    return { secretKey };
  },
  async testConnection(credentials, environment) {
    const { secretKey } = this.validateCredentials(credentials, environment);
    const response = await fetch(`${API}/bank?country=nigeria&perPage=1`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.status) {
      return { success: false, message: safeProviderError(payload, "Paystack connection test failed.") };
    }
    return { success: true, message: "Paystack credentials were accepted." };
  },
  async initializePayment({ credentials, environment, order, reference, callbackUrl }) {
    const { secretKey } = this.validateCredentials(credentials, environment);
    const currency = normalizeCurrency(order.currency);
    if (!this.supportedCurrencies.includes(currency)) {
      throw new Error("This payment provider does not support the currency required for this order.");
    }
    const amount = Math.round(Number(order.amount) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("The order amount is invalid.");
    const response = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: order.email, amount, currency, reference, callback_url: callbackUrl, metadata: { order_id: order.orderId, listing_id: order.listingId } }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.status || !payload.data?.authorization_url || !payload.data?.reference) {
      throw new Error(safeProviderError(payload, "The payment provider could not start checkout."));
    }
    const checkoutUrl = new URL(payload.data.authorization_url);
    if (checkoutUrl.protocol !== "https:" || !(checkoutUrl.hostname === "paystack.com" || checkoutUrl.hostname.endsWith(".paystack.com"))) {
      throw new Error("The payment provider returned an invalid checkout address.");
    }
    return {
      success: true,
      reference: payload.data.reference,
      providerTransactionId: payload.data.id == null ? null : String(payload.data.id),
      checkoutUrl: checkoutUrl.toString(),
      status: "pending",
      message: null,
    };
  },
  async verifyPayment({ credentials, environment, reference }) {
    const { secretKey } = this.validateCredentials(credentials, environment);
    const response = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.status || !payload.data) {
      return { success: false, reference, providerTransactionId: null, status: "unknown", amount: null, currency: null, paidAt: null, message: "The payment provider could not verify this transaction." };
    }
    const data = payload.data;
    const currency = normalizeCurrency(data.currency);
    const status = normalizeProviderStatus(data.status);
    return {
      success: status === "paid",
      reference: String(data.reference || reference),
      providerTransactionId: data.id == null ? null : String(data.id),
      status,
      amount: minorAmountToMajor(data.amount, currency),
      providerFee: minorAmountToMajor(data.fees, currency),
      totalCharged: minorAmountToMajor(data.amount, currency),
      currency,
      paidAt: data.paid_at || data.paidAt || null,
      message: null,
    };
  },
  async getPaymentStatus({ credentials, environment, reference }) {
    return this.verifyPayment({ credentials, environment, reference });
  },
  verifyWebhookSignature(rawBody, signature, credentials, environment) {
    const { secretKey } = this.validateCredentials(credentials, environment);
    if (typeof signature !== "string" || !/^[a-f0-9]{128}$/i.test(signature)) return false;
    const expected = createHmac("sha512", secretKey).update(rawBody).digest();
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  },
});
