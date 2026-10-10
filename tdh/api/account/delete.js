import { adminClient, bearer, json } from "../../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const token = bearer(req);
  if (!token) return json(res, 401, { error: "Sign in before deleting your account." });

  try {
    const supabase = adminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json(res, 401, { error: "Your session has expired. Sign in again." });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (profile?.role === "admin") {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count || 0) <= 1) return json(res, 400, { error: "At least one administrator must remain before this account can be deleted." });
    }
    const { error } = await supabase.auth.admin.deleteUser(userData.user.id);
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, { deleted: true });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Account deletion failed." });
  }
}
