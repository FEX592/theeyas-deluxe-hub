import { authenticate, createPayment } from "../../lib/payments/server.js";
import { json, requestOrigin } from "../../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const auth = await authenticate(req);
    if (auth.error) return json(res, auth.error.status, { error: auth.error.message });
    const result = await createPayment({
      supabase: auth.supabase,
      user: auth.user,
      listingId: req.body?.listingId,
      whatsappNumber: req.body?.whatsappNumber,
      origin: requestOrigin(req),
    });
    return json(res, result.status, result.body);
  } catch {
    return json(res, 500, { error: "Checkout could not be started." });
  }
}
