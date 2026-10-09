import { createClient } from "@supabase/supabase-js";

export function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(body);
}

export function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export function adminClient() {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function requestOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : "";
}
