import { adminClient, json } from "../../lib/server.js";

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function allowed(req) {
  const key = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.startedAt > WINDOW_MS) { attempts.set(key, { startedAt: now, count: 1 }); return true; }
  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!allowed(req)) return json(res, 429, { error: "Too many attempts. Try again later." });
  const orderId = String(req.body?.orderId || "").trim();
  const whatsappNumber = String(req.body?.whatsappNumber || "").trim();
  if (!/^TDH-[A-Z0-9]{4,32}$/i.test(orderId) || whatsappNumber.length < 6 || whatsappNumber.length > 32) return json(res, 400, { error: "Enter a valid Order ID and WhatsApp number." });
  try {
    const supabase = adminClient();
    const { data, error } = await supabase.from("orders").select("order_id,listing_id,whatsapp_number,payment_status,order_status,created_at,access_link, listings(name)").eq("order_id", orderId).eq("whatsapp_number", whatsappNumber).maybeSingle();
    if (error || !data) return json(res, 404, { error: "We could not find an order with those details." });
    const eligible = data.payment_status === "success" && data.order_status === "completed" && typeof data.access_link === "string" && /^https:\/\//i.test(data.access_link);
    return json(res, 200, { order: { order_id: data.order_id, payment_status: data.payment_status, order_status: data.order_status, created_at: data.created_at, listing_name: data.listings?.name || null, access_link: eligible ? data.access_link : null } });
  } catch {
    return json(res, 500, { error: "Order tracking is temporarily unavailable." });
  }
}
