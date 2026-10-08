import { env, json } from "../lib/server.js";

export default function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  return json(res, 200, {
    supabaseUrl: env("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    supabaseAnonKey: env("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
    paystackPublicKey: env("VITE_PAYSTACK_PUBLIC_KEY", "PAYSTACK_PUBLIC_KEY"),
  });
}
