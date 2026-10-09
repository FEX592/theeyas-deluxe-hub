import { createHash } from "node:crypto";
import { getAdapter } from "./registry.js";
import { applyVerifiedWebhook, getProviderCredentials } from "./server.js";
import { adminClient, json } from "../server.js";

const MAX_BODY = 1024 * 1024;

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > MAX_BODY) throw new Error("Request too large");
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

export async function handleProviderWebhook(req, res, providerKey) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const adapter = getAdapter(providerKey);
  if (!adapter?.parseWebhookEvent || !adapter.webhookSignatureHeader || !adapter.verifyWebhookSignature) {
    return json(res, 404, { error: "Webhook handler is not installed for this provider." });
  }

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch { return json(res, 413, { error: "Webhook payload is too large." }); }

  let event;
  try { event = adapter.parseWebhookEvent(rawBody); }
  catch { return json(res, 400, { error: "Invalid webhook payload." }); }
  if (!event || event.ignored || !event.reference) return json(res, 200, { received: true, ignored: true });
  if (typeof event.eventId !== "string" || typeof event.eventType !== "string") return json(res, 400, { error: "Webhook event is invalid." });
  if (!/^[A-Za-z0-9_.=-]{1,128}$/.test(event.reference)) return json(res, 200, { received: true, ignored: true });

  try {
    const supabase = adminClient();
    const { data: transaction } = await supabase.from("payment_transactions")
      .select("id,config_version_id")
      .eq("provider_key", providerKey)
      .or(`provider_reference.eq.${event.reference},internal_reference.eq.${event.reference}`)
      .maybeSingle();
    // Unknown references cannot alter state; acknowledge without disclosing transaction existence.
    if (!transaction) return json(res, 200, { received: true, ignored: true });
    const { data: config } = await supabase.from("payment_provider_configs")
      .select("environment")
      .eq("id", transaction.config_version_id)
      .maybeSingle();
    if (!config) return json(res, 503, { error: "Webhook verification is temporarily unavailable." });

    const credentials = await getProviderCredentials(supabase, providerKey, transaction.config_version_id);
    const signature = req.headers[String(adapter.webhookSignatureHeader).toLowerCase()];
    if (!credentials || !adapter.verifyWebhookSignature(rawBody, signature, credentials, config.environment)) {
      return json(res, 401, { error: "Invalid webhook signature." });
    }

    const result = await applyVerifiedWebhook({
      supabase,
      providerKey,
      reference: event.reference,
      providerTransactionId: event.providerTransactionId || null,
      eventId: `${event.eventId}:${transaction.config_version_id}`,
      eventType: event.eventType,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    });
    if (result.status === "unavailable") return json(res, 503, { error: "Webhook verification is temporarily unavailable." });
    return json(res, 200, { received: true, status: result.status });
  } catch {
    return json(res, 500, { error: "Webhook processing failed." });
  }
}
