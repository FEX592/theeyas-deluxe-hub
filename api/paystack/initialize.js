import { randomUUID } from "node:crypto";
import { adminClient, bearer, env, json, requestOrigin } from "../../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const token = bearer(req);
  const secret = env("PAYSTACK_SECRET_KEY");
  if (!token) return json(res, 401, { error: "Sign in before starting checkout." });
  if (!secret) return json(res, 503, { error: "Paystack is not configured on this deployment." });

  try {
    const supabase = adminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json(res, 401, { error: "Your session has expired. Sign in again." });

    const { listingId, whatsappNumber, email } = req.body || {};
    if (!listingId || !whatsappNumber || !email) return json(res, 400, { error: "Listing, email, and WhatsApp number are required." });

    const { data: listing, error: listingError } = await supabase.from("listings").select("id,name,price,currency,status").eq("id", listingId).eq("status", "published").maybeSingle();
    if (listingError || !listing) return json(res, 404, { error: "This listing is no longer available." });

    const orderId = `TDH-${randomUUID().slice(0, 8).toUpperCase()}`;
    const reference = `tdh_${randomUUID().replaceAll("-", "")}`;
    const { error: orderError } = await supabase.from("orders").insert({ order_id: orderId, user_id: userData.user.id, whatsapp_number: String(whatsappNumber).trim(), customer_email: String(email).trim(), listing_id: listing.id, payment_reference: reference });
    if (orderError) return json(res, 500, { error: "We could not create the order. Please try again." });

    const currency = listing.currency === "₦" ? "NGN" : listing.currency;
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(email).trim(),
        amount: Math.round(Number(listing.price) * 100),
        currency,
        reference,
        callback_url: `${requestOrigin(req)}/?reference=${encodeURIComponent(reference)}`,
        metadata: { order_id: orderId, listing_id: listing.id, user_id: userData.user.id },
      }),
    });
    const payload = await paystackResponse.json();
    if (!paystackResponse.ok || !payload.status || !payload.data?.authorization_url) {
      await supabase.from("orders").delete().eq("order_id", orderId);
      return json(res, 502, { error: payload.message || "Paystack could not start the payment." });
    }

    return json(res, 200, { authorization_url: payload.data.authorization_url, order_id: orderId, reference });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Checkout could not be started." });
  }
}
