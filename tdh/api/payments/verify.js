import { authenticate, verifyForUser } from "../../lib/payments/server.js";
import { json } from "../../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const auth = await authenticate(req);
    if (auth.error) return json(res, auth.error.status, { error: auth.error.message });
    const result = await verifyForUser({ supabase: auth.supabase, user: auth.user, reference: req.query?.reference });
    return json(res, result.status, result.body);
  } catch {
    return json(res, 500, { error: "Payment status could not be checked." });
  }
}
