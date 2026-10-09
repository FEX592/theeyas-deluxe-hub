import { timingSafeEqual } from "node:crypto";
import { adminClient, env, json } from "../../lib/server.js";

function matchesSecret(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const setupSecret = env("TDH_BOOTSTRAP_SECRET");
  const ownerEmail = env("TDH_OWNER_EMAIL").trim().toLowerCase();
  const ownerPassword = env("TDH_OWNER_PASSWORD");
  if (!setupSecret || !ownerEmail || !ownerPassword) return json(res, 503, { error: "Initial owner setup is not configured." });
  if (!matchesSecret(req.headers["x-tdh-bootstrap-secret"], setupSecret)) return json(res, 401, { error: "Initial owner setup authorization is invalid." });
  if (ownerPassword.length < 12) return json(res, 503, { error: "The configured owner password does not meet the minimum length." });

  try {
    const supabase = adminClient();
    const { data: existingAdmins, error: adminError } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1);
    if (adminError) return json(res, 503, { error: "Initial owner status could not be checked." });
    if (existingAdmins?.length) return json(res, 409, { error: "Initial owner setup is already closed." });

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: ownerEmail.split("@")[0] },
      app_metadata: { tdh_bootstrap: true },
    });
    if (createError || !created.user) {
      if (/already registered|already been registered/i.test(createError?.message || "")) return json(res, 409, { error: "The configured owner account already exists; setup is closed or needs recovery." });
      return json(res, 502, { error: "The initial owner account could not be created." });
    }

    const { data: bootstrapped, error: bootstrapError } = await supabase.rpc("bootstrap_initial_admin", {
      p_user_id: created.user.id,
    });
    if (bootstrapError || !bootstrapped) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return json(res, 409, { error: "Initial owner setup was already completed by another request." });
    }
    return json(res, 201, { success: true, message: "Initial owner established. Public registration is now available." });
  } catch {
    return json(res, 500, { error: "Initial owner setup could not be completed." });
  }
}
