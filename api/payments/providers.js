import { getAdapter, listAdapters } from "../../lib/payments/registry.js";
import { getProviderCredentials, recordAudit, requireAdmin } from "../../lib/payments/server.js";
import { json } from "../../lib/server.js";

const ENVIRONMENTS = new Set(["test", "live"]);

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return json(res, auth.error.status, { error: auth.error.message });
    const { supabase, user } = auth;

    if (req.method === "GET") {
      const { error: syncError } = await supabase.from("payment_providers").upsert(
        listAdapters().map((adapter) => ({ adapter_key: adapter.key, display_name: adapter.name, capabilities: adapter.capabilities })),
        { onConflict: "adapter_key" },
      );
      if (syncError) return json(res, 503, { error: "Payment settings are not installed yet. Apply the payment architecture migration first." });
      const [{ data: providers, error: providerError }, { data: configs, error: configError }] = await Promise.all([
        supabase.from("payment_providers").select("adapter_key,enabled,active,environment"),
        supabase.from("payment_provider_configs").select("id,provider_key,environment,version,connection_verified_at,is_current").eq("is_current", true),
      ]);
      if (providerError || configError) return json(res, 503, { error: "Payment settings are not installed yet. Apply the payment architecture migration first." });
      const providerMap = new Map((providers || []).map((provider) => [provider.adapter_key, provider]));
      const configMap = new Map((configs || []).map((config) => [`${config.provider_key}:${config.environment}`, config]));
      const result = listAdapters().map((adapter) => {
        const provider = providerMap.get(adapter.key);
        const config = provider ? configMap.get(`${adapter.key}:${provider.environment}`) : null;
        const envConfigs = ["test", "live"].map((environment) => {
          const item = configMap.get(`${adapter.key}:${environment}`);
          return { environment, configured: Boolean(item), connectionVerified: Boolean(item?.connection_verified_at) };
        });
        return {
          providerKey: adapter.key,
          name: adapter.name,
          enabled: Boolean(provider?.enabled),
          active: Boolean(provider?.active),
          environment: provider?.environment || "test",
          configured: Boolean(config),
          connectionVerified: Boolean(config?.connection_verified_at),
          capabilities: adapter.capabilities,
          supportedCurrencies: adapter.supportedCurrencies,
          configurationSchema: adapter.configurationSchema,
          environments: envConfigs,
        };
      });
      return json(res, 200, { providers: result });
    }

    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const { action, providerKey, environment = "test" } = req.body || {};
    const adapter = getAdapter(providerKey);
    if (!adapter) return json(res, 404, { error: "That payment provider does not have an installed adapter." });
    if (!ENVIRONMENTS.has(environment)) return json(res, 400, { error: "Choose a supported test or live environment." });

    if (action === "save") {
      let credentials;
      try {
        credentials = adapter.validateCredentials(req.body?.credentials || {}, environment);
      } catch (error) {
        return json(res, 400, { error: error instanceof Error ? error.message : "Provider credentials are invalid." });
      }
      const [{ data: oldProvider }, { data: oldConfig, error: oldConfigError }] = await Promise.all([
        supabase.from("payment_providers").select("active,environment").eq("adapter_key", providerKey).maybeSingle(),
        supabase.from("payment_provider_configs").select("id").eq("provider_key", providerKey).eq("environment", environment).eq("is_current", true).maybeSingle(),
      ]);
      if (oldConfigError) return json(res, 503, { error: "Payment settings are not installed yet. Apply the payment architecture migration first." });
      const { data: configVersionId, error } = await supabase.rpc("write_payment_provider_config", {
        p_provider_key: providerKey,
        p_environment: environment,
        p_credentials: credentials,
        p_actor: user.id,
      });
      if (error || !configVersionId) return json(res, 500, { error: "Provider credentials could not be stored securely." });
      if (oldProvider?.active && oldProvider.environment === environment) {
        await supabase.from("payment_providers").update({ active: false }).eq("adapter_key", providerKey);
      }
      await recordAudit(supabase, user.id, oldConfig ? "credentials_updated" : "provider_configured", providerKey, "success", { environment });
      return json(res, 200, { success: true, configurationVersionId: configVersionId, message: "Credentials stored encrypted. Test the connection before activating this configuration." });
    }

    const { data: config, error: configError } = await supabase.from("payment_provider_configs")
      .select("id,environment,connection_verified_at")
      .eq("provider_key", providerKey)
      .eq("environment", environment)
      .eq("is_current", true)
      .maybeSingle();
    if (configError) return json(res, 503, { error: "Payment settings are not installed yet. Apply the payment architecture migration first." });

    if (action === "test") {
      if (!config) return json(res, 400, { error: "Save provider credentials before testing the connection." });
      const credentials = await getProviderCredentials(supabase, providerKey, config.id);
      if (!credentials) return json(res, 500, { error: "Stored credentials could not be read from Vault." });
      let result;
      try { result = await adapter.testConnection(credentials, environment); }
      catch { result = { success: false, message: "The connection test failed without changing the active provider." }; }
      if (!result.success) {
        await recordAudit(supabase, user.id, "connection_tested", providerKey, "failure", { environment, reason: result.message });
        return json(res, 422, { success: false, message: result.message || "Connection test failed." });
      }
      const { error } = await supabase.rpc("mark_payment_provider_tested", { p_config_version_id: config.id });
      if (error) return json(res, 500, { error: "Connection succeeded, but its verification status could not be saved." });
      await recordAudit(supabase, user.id, "connection_tested", providerKey, "success", { environment });
      return json(res, 200, { success: true, message: result.message || "Connection successful." });
    }

    if (action === "activate") {
      const requiredCapabilities = ["payment_initialization", "payment_verification"];
      if (!requiredCapabilities.every((capability) => adapter.capabilities.includes(capability))) {
        return json(res, 409, { error: "Provider cannot be activated because required checkout capabilities are unavailable." });
      }
      if (!config) return json(res, 400, { error: "Configure and test this provider before activation." });
      if (!config.connection_verified_at) return json(res, 409, { error: "Test the current configuration before activation." });
      const { error } = await supabase.rpc("activate_payment_provider", {
        p_provider_key: providerKey,
        p_environment: environment,
        p_config_version_id: config.id,
      });
      if (error) return json(res, 409, { error: "The provider could not be activated. Verify that its configuration is current and tested." });
      await recordAudit(supabase, user.id, "provider_activated", providerKey, "success", { environment });
      return json(res, 200, { success: true, message: "Provider activated for new checkouts. Existing transactions keep their original configuration." });
    }

    if (action === "deactivate") {
      const { error } = await supabase.from("payment_providers").update({ active: false }).eq("adapter_key", providerKey).eq("active", true);
      if (error) return json(res, 500, { error: "The provider could not be deactivated." });
      await recordAudit(supabase, user.id, "provider_deactivated", providerKey, "success", { environment });
      return json(res, 200, { success: true, message: "Provider deactivated. New checkouts will remain unavailable until a provider is activated." });
    }

    return json(res, 400, { error: "Unsupported provider-management action." });
  } catch {
    return json(res, 500, { error: "Payment provider settings could not be loaded." });
  }
}
