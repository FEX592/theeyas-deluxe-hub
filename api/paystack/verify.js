import { adminClient, bearer, env, json } from "../../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const token = bearer(req);
  const reference = req.query?.reference;
  const secret = env("PAYSTACK_SECRET_KEY");
  if (!token) return json(res, 401, { error: "Sign in before verifying payment." });
  if (!reference) return json(res, 400, { error: "Payment reference is missing." });
  if (!secret) return json(res, 503, { error: "Paystack is not configured on this deployment." });

  try {
    const supabase = adminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json(res, 401, { error: "Your session has expired. Sign in again." });
    const { data: order, error: orderError } = await supabase.from("orders").select("id,user_id").eq("payment_reference", reference).eq("user_id", userData.user.id).maybeSingle();
    if (orderError || !order) return json(res, 404, { error: "Order not found." });

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const payload = await paystackResponse.json();
    const paid = Boolean(paystackResponse.ok && payload.status && payload.data?.status === "success");
    const { error: updateError } = await supabase.from("orders").update({ payment_status: paid ? "success" : "failed", order_status: paid ? "processing" : "failed" }).eq("id", order.id);
    if (updateError) return json(res, 500, { error: "Payment was checked but the order status could not be saved." });
    return json(res, 200, { status: paid ? "success" : "failed", order_id: order.id });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Payment could not be verified." });
  }
}
