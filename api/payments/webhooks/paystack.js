import { handleProviderWebhook } from "../../../lib/payments/webhook-handler.js";

export const config = { api: { bodyParser: false } };
export default function handler(req, res) { return handleProviderWebhook(req, res, "paystack"); }
