import { randomUUID } from "node:crypto";
import { adminClient, bearer } from "../server.js";
import { getAdapter } from "./registry.js";
import { normalizeCurrency } from "./types.js";

export async function authenticate(req) {
  const token = bearer(req);
  if (!token) return { error: { status: 401, message: "Sign in to continue." } };
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: { status: 401, message: "Your session has expired. Sign in again." } };
  return { supabase, user: data.user };
}

export async function requireAdmin(req) {
  const auth = await authenticate(req);
  if (auth.error) return auth;
  const { data: profile, error } = await auth.supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (error || profile?.role !== "admin") return { error: { status: 403, message: "Administrator access is required." } };
  return auth;
}

export async function getProviderCredentials(supabase, providerKey, configVersionId = null) {
  const { data, error } = await supabase.rpc("read_payment_provider_credentials", {
    p_provider_key: providerKey,
    p_config_version_id: configVersionId,
  });
  if (error || !data) return null;
  try { return typeof data === "string" ? JSON.parse(data) : data; }
  catch { return null; }
}

export async function recordAudit(supabase, actorId, action, providerKey, result = "success", details = {}) {
  await supabase.from("payment_provider_audit_log").insert({
    actor_id: actorId,
    action,
    provider_key: providerKey,
    result,
    details: sanitizeAuditDetails(details),
  });
}

function sanitizeAuditDetails(details) {
  const safe = {};
  for (const key of ["environment", "reason", "capabilities"]) {
    if (details?.[key] != null) safe[key] = details[key];
  }
  return safe;
}

export async function createPayment({ supabase, user, listingId, whatsappNumber, origin }) {
  if (!listingId || typeof listingId !== "string" || !whatsappNumber || typeof whatsappNumber !== "string") {
    return { status: 400, body: { error: "A listing and WhatsApp number are required." } };
  }
  const phone = whatsappNumber.trim();
  if (phone.length < 6 || phone.length > 32) return { status: 400, body: { error: "Enter a valid WhatsApp number." } };
  if (!user.email) return { status: 400, body: { error: "Your account needs an email address before checkout." } };

  const { data: listing, error: listingError } = await supabase.from("listings")
    .select("id,name,price,currency,status")
    .eq("id", listingId)
    .eq("status", "published")
    .maybeSingle();
  if (listingError || !listing) return { status: 404, body: { error: "This listing is no longer available." } };

  const { data: provider, error: providerError } = await supabase.from("payment_providers")
    .select("adapter_key,active,environment")
    .eq("active", true)
    .eq("enabled", true)
    .maybeSingle();
  if (providerError || !provider) return { status: 503, body: { error: "Checkout is temporarily unavailable because no payment provider is active." } };

  const adapter = getAdapter(provider.adapter_key);
  if (!adapter) return { status: 503, body: { error: "The active payment provider is not installed." } };
  const currency = normalizeCurrency(listing.currency);
  if (!adapter.supportedCurrencies.includes(currency)) return { status: 400, body: { error: "This payment provider does not support the currency required for this order." } };

  const { data: config, error: configError } = await supabase.from("payment_provider_configs")
    .select("id,environment")
    .eq("provider_key", provider.adapter_key)
    .eq("environment", provider.environment)
    .eq("is_current", true)
    .maybeSingle();
  if (configError || !config) return { status: 503, body: { error: "The active payment provider is not configured." } };
  const credentials = await getProviderCredentials(supabase, provider.adapter_key, config.id);
  if (!credentials) return { status: 503, body: { error: "The active payment provider credentials are unavailable." } };

  const amount = Number(Number(listing.price).toFixed(2));
  if (!Number.isFinite(amount) || amount <= 0) return { status: 400, body: { error: "The listing price is invalid." } };
  const orderId = `TDH-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const reference = `tdh_${randomUUID().replaceAll("-", "")}`;
  const { data: order, error: orderError } = await supabase.from("orders").insert({
    order_id: orderId,
    user_id: user.id,
    whatsapp_number: phone,
    customer_email: user.email,
    listing_id: listing.id,
    payment_reference: reference,
    payment_provider: provider.adapter_key,
    order_status: "pending",
    payment_status: "pending",
  }).select("id,order_id").single();
  if (orderError || !order) return { status: 500, body: { error: "We could not create the order. Please try again." } };

  const { data: transaction, error: transactionError } = await supabase.from("payment_transactions").insert({
    order_id: order.id,
    provider_key: provider.adapter_key,
    config_version_id: config.id,
    internal_reference: reference,
    amount,
    currency,
    status: "pending",
  }).select("id").single();
  if (transactionError || !transaction) {
    await supabase.from("orders").update({ payment_status: "failed", order_status: "failed" }).eq("id", order.id);
    return { status: 500, body: { error: "We could not initialize the payment record." } };
  }
  await supabase.from("orders").update({ payment_transaction_id: transaction.id }).eq("id", order.id);

  try {
    const initialized = await adapter.initializePayment({
      credentials,
      environment: provider.environment,
      order: { orderId, listingId: listing.id, amount, currency, email: user.email },
      reference,
      callbackUrl: `${origin}/?reference=${encodeURIComponent(reference)}`,
    });
    const { error: updateError } = await supabase.from("payment_transactions").update({
      provider_reference: initialized.reference,
      provider_transaction_id: initialized.providerTransactionId,
      status: initialized.status,
    }).eq("id", transaction.id);
    if (updateError) throw new Error("Payment was initialized, but its reference could not be saved.");
    await supabase.from("orders").update({ payment_reference: initialized.reference, payment_transaction_id: transaction.id }).eq("id", order.id);
    return { status: 200, body: { orderId, paymentReference: initialized.reference, checkoutUrl: initialized.checkoutUrl, provider: provider.adapter_key } };
  } catch (error) {
    await supabase.rpc("apply_payment_result", { p_transaction_id: transaction.id, p_status: "failed", p_provider_transaction_id: null, p_paid_at: null, p_failure_reason: safeMessage(error) });
    return { status: 502, body: { error: safeMessage(error) || "The payment provider could not start checkout." } };
  }
}

export async function verifyForUser({ supabase, user, reference }) {
  const safeReference = String(reference || "");
  if (!/^[A-Za-z0-9_.=-]{1,128}$/.test(safeReference)) return { status: 400, body: { error: "Payment reference is invalid." } };
  const { data: transaction, error } = await supabase.from("payment_transactions")
    .select("id,order_id,provider_key,config_version_id,internal_reference,provider_reference,amount,currency,status,provider_transaction_id")
    .or(`internal_reference.eq.${safeReference},provider_reference.eq.${safeReference}`)
    .maybeSingle();
  if (error || !transaction) return { status: 404, body: { error: "Payment record not found." } };
  const { data: order, error: orderError } = await supabase.from("orders").select("id,user_id,order_status").eq("id", transaction.order_id).maybeSingle();
  if (orderError || !order || order.user_id !== user.id) return { status: 404, body: { error: "Payment record not found." } };

  if (transaction.status === "paid") return { status: 200, body: { status: "paid", orderId: order.id } };
  const adapter = getAdapter(transaction.provider_key);
  if (!adapter) return { status: 503, body: { error: "The original payment provider is not installed." } };
  const credentials = await getProviderCredentials(supabase, transaction.provider_key, transaction.config_version_id);
  if (!credentials) return { status: 503, body: { error: "The original payment credentials are unavailable." } };
  const config = await supabase.from("payment_provider_configs").select("environment").eq("id", transaction.config_version_id).maybeSingle();
  if (!config.data) return { status: 503, body: { error: "The original payment environment is unavailable." } };

  try {
    const statusCheck = adapter.getPaymentStatus || adapter.verifyPayment;
    const result = await statusCheck.call(adapter, { credentials, environment: config.data.environment, reference: transaction.provider_reference || transaction.internal_reference });
    let status = result.status;
    const expectedAmount = Number(transaction.amount);
    if (status === "paid" && (result.amount === null || Math.abs(Number(result.amount) - expectedAmount) > 0.01 || result.currency !== transaction.currency)) status = "unknown";
    const { error: applyError } = await supabase.rpc("apply_payment_result", {
      p_transaction_id: transaction.id,
      p_status: status,
      p_provider_transaction_id: result.providerTransactionId,
      p_paid_at: status === "paid" ? result.paidAt : null,
      p_failure_reason: status === "paid" ? null : "The provider has not confirmed the expected amount and currency.",
      p_provider_fee: result.providerFee,
      p_total_charged: result.totalCharged,
    });
    if (applyError) return { status: 500, body: { error: "The payment was verified but its status could not be saved." } };
    return { status: 200, body: { status, orderId: order.id } };
  } catch {
    return { status: 502, body: { error: "The payment provider could not verify this transaction." } };
  }
}

export async function applyVerifiedWebhook({ supabase, providerKey, reference, providerTransactionId, eventId, eventType, payloadHash }) {
  const { data: transaction, error } = await supabase.from("payment_transactions")
    .select("id,order_id,config_version_id,provider_reference,internal_reference,amount,currency,status")
    .eq("provider_key", providerKey)
    .or(`provider_reference.eq.${reference},internal_reference.eq.${reference}`)
    .maybeSingle();
  if (error || !transaction) return { status: "ignored", message: "No matching transaction." };

  const credentials = await getProviderCredentials(supabase, providerKey, transaction.config_version_id);
  const adapter = getAdapter(providerKey);
  const config = await supabase.from("payment_provider_configs").select("environment").eq("id", transaction.config_version_id).maybeSingle();
  if (!adapter || !credentials || !config.data) return { status: "unavailable", message: "Payment configuration unavailable." };
  const result = await adapter.verifyPayment({ credentials, environment: config.data.environment, reference: transaction.provider_reference || transaction.internal_reference });
  let status = result.status;
  if (status === "paid" && (result.amount === null || Math.abs(Number(result.amount) - Number(transaction.amount)) > 0.01 || result.currency !== transaction.currency)) status = "unknown";

  const event = await supabase.from("payment_webhook_events").upsert({
    provider_key: providerKey,
    provider_event_id: eventId,
    event_type: eventType,
    payload_hash: payloadHash,
    processed: status === "paid",
    processed_at: status === "paid" ? new Date().toISOString() : null,
  }, { onConflict: "provider_key,provider_event_id", ignoreDuplicates: false }).select("id");
  if (event.error) throw new Error("Webhook event could not be recorded.");

  const { error: applyError } = await supabase.rpc("apply_payment_result", {
    p_transaction_id: transaction.id,
    p_status: status,
    p_provider_transaction_id: result.providerTransactionId || providerTransactionId || null,
    p_paid_at: status === "paid" ? result.paidAt : null,
    p_failure_reason: status === "paid" ? null : "Provider webhook did not verify as a paid transaction.",
    p_provider_fee: result.providerFee,
    p_total_charged: result.totalCharged,
  });
  if (applyError) throw new Error("Verified webhook result could not be saved.");
  return { status: "processed", paymentStatus: status };
}

export function safeMessage(error) {
  return "Checkout could not be started. Please try again shortly.";
}
