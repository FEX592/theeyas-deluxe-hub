import { useEffect, useMemo, useState } from "react";
import { Activity, Check, CreditCard, RefreshCw, ShieldCheck, X } from "lucide-react";

type ConfigField = { key: string; label: string; type: string; required?: boolean; help?: string };
type EnvironmentStatus = { environment: "test" | "live"; configured: boolean; connectionVerified: boolean };
type Provider = {
  providerKey: string;
  name: string;
  enabled: boolean;
  active: boolean;
  environment: "test" | "live";
  configured: boolean;
  connectionVerified: boolean;
  capabilities: string[];
  configurationSchema: ConfigField[];
  environments: EnvironmentStatus[];
};

type Props = { session: any };

const capabilityLabels: Record<string, string> = {
  payment_initialization: "Payment initialization",
  payment_verification: "Payment verification",
  payment_status: "Payment status",
  webhooks: "Webhooks",
  redirect_checkout: "Redirect checkout",
  refunds: "Refunds",
  partial_refunds: "Partial refunds",
  payment_links: "Payment links",
  embedded_checkout: "Embedded checkout",
};

export default function PaymentsSettings({ session }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Record<string, "test" | "live">>({});
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/providers", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Payment settings could not be loaded.");
      setProviders(payload.providers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [session?.access_token]);

  const runAction = async (provider: Provider, action: "save" | "test" | "activate" | "deactivate", credentials?: Record<string, string>) => {
    const environment = selectedEnvironment[provider.providerKey] || provider.environment || "test";
    if (action === "activate") {
      const warning = environment === "live"
        ? `Activate ${provider.name} in LIVE mode? New checkouts will use live payments. Existing transactions remain tied to their original provider and configuration.`
        : `Activate ${provider.name} in TEST mode? New checkouts will use test payments. Existing transactions remain tied to their original provider and configuration.`;
      if (!window.confirm(warning)) return;
    }
    if (action === "deactivate" && !window.confirm(`Deactivate ${provider.name}? New checkout will be unavailable until a provider is activated.`)) return;

    const key = `${provider.providerKey}:${action}`;
    setWorking(key);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, providerKey: provider.providerKey, environment, credentials }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || payload.message || "The payment setting could not be updated.");
      setMessage(payload.message || (action === "save" ? "Configuration saved." : "Action completed."));
      if (action === "save") setValues((current) => ({ ...current, [provider.providerKey]: {} }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The payment setting could not be updated.");
    } finally {
      setWorking("");
    }
  };

  const content = useMemo(() => providers.map((provider) => {
    const environment = selectedEnvironment[provider.providerKey] || provider.environment || "test";
    const envState = provider.environments.find((item) => item.environment === environment);
    const configured = Boolean(envState?.configured);
    const fields = provider.configurationSchema || [];
    const providerValues = values[provider.providerKey] || {};
    return <section className="admin-card payment-provider-card" key={provider.providerKey}>
      <div className="admin-card-heading payment-provider-heading">
        <div className="payment-provider-title"><span className="payment-provider-icon"><CreditCard size={17} /></span><div><span className="eyebrow">INSTALLED ADAPTER</span><h2>{provider.name}</h2></div></div>
        <span className={`payment-state ${provider.active ? "is-active" : configured && envState?.connectionVerified ? "is-connected" : "is-unconfigured"}`}>{provider.active && provider.environment === environment ? "Active" : configured && envState?.connectionVerified ? "Connected" : configured ? "Configured" : "Not configured"}</span>
      </div>
      <div className="payment-provider-facts">
        <div><span>Status</span><strong>{provider.active && provider.environment === environment ? "Active for new checkouts" : configured && envState?.connectionVerified ? "Connection verified" : configured ? "Test required" : "Configuration required"}</strong></div>
        <label className="field payment-environment"><span>Environment</span><select value={environment} onChange={(event) => setSelectedEnvironment((current) => ({ ...current, [provider.providerKey]: event.target.value as "test" | "live" }))}><option value="test">Test / sandbox</option><option value="live">Live / production</option></select></label>
      </div>
      {environment === "live" && <div className="payment-live-warning"><ShieldCheck size={15} /><span>Live mode processes real payments. Use live credentials only after you have verified this account and configuration.</span></div>}
      <div className="payment-capabilities"><span>Capabilities</span><div>{provider.capabilities.map((capability) => <span className="capability-chip" key={capability}>{capabilityLabels[capability] || capability}</span>)}</div></div>
      <div className="payment-env-status"><span>Saved environments</span>{provider.environments.map((item) => <span key={item.environment} className="env-chip"><strong>{item.environment === "live" ? "Live" : "Test"}</strong>{item.configured ? (item.connectionVerified ? " · tested" : " · configured") : " · not configured"}</span>)}</div>
      <div className="payment-config-form">
        <div className="payment-config-heading"><div><span className="eyebrow">PROVIDER CONFIGURATION</span><h3>{configured ? "Replace credentials or test existing configuration" : "Configure this environment"}</h3></div><span className="vault-note"><ShieldCheck size={13} /> Encrypted storage</span></div>
        {fields.map((field) => <label className="field" key={field.key}><span>{field.label}{field.required && !configured ? " *" : ""}</span><input type={field.type === "secret" ? "password" : "text"} value={providerValues[field.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [provider.providerKey]: { ...(current[provider.providerKey] || {}), [field.key]: event.target.value } }))} placeholder={configured && field.type === "secret" ? "Saved securely — enter a replacement only to rotate" : `Enter ${field.label}`} required={Boolean(field.required && !configured)} autoComplete={field.type === "secret" ? "new-password" : "off"} />{field.help && <small className="field-help">{field.help}</small>}</label>)}
        <div className="payment-actions">
          <button className="button button-primary" disabled={Boolean(working) || fields.some((field) => field.required && !String(providerValues[field.key] || "").trim())} onClick={() => void runAction(provider, "save", providerValues)}>{working === `${provider.providerKey}:save` ? <RefreshCw className="spin" size={14} /> : <Check size={14} />} Save configuration</button>
          <button className="button button-outline" disabled={Boolean(working) || !configured} onClick={() => void runAction(provider, "test")}>{working === `${provider.providerKey}:test` ? <RefreshCw className="spin" size={14} /> : <Activity size={14} />} Test connection</button>
          {provider.active && provider.environment === environment
            ? <button className="button button-danger" disabled={Boolean(working)} onClick={() => void runAction(provider, "deactivate")}><X size={14} /> Deactivate</button>
            : <button className="button button-gold" disabled={Boolean(working) || !configured || !envState?.connectionVerified} onClick={() => void runAction(provider, "activate")}><Check size={14} /> Activate</button>}
        </div>
      </div>
    </section>;
  }), [providers, selectedEnvironment, values, working, session?.access_token]);

  return <div className="payments-settings">
    <div className="payments-intro"><div><span className="eyebrow">CHECKOUT CONTROL</span><h2>Payment providers</h2><p>Only installed adapters are listed. Configure and test a provider before activating it for new checkouts.</p></div><button className="button button-ghost" disabled={loading || Boolean(working)} onClick={() => void load()}><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh</button></div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {message && <div className="notice notice-success" role="status">{message}</div>}
    {loading ? <div className="admin-loading"><RefreshCw className="spin" size={18} /><span>Loading provider settings</span></div> : providers.length ? <div className="payment-provider-list">{content}</div> : !error ? <div className="admin-card"><p>No payment adapter is installed.</p></div> : null}
    <p className="payment-footnote">Credentials are never returned to the browser after saving. Switching providers affects new checkouts only; historical transactions retain their original provider and configuration version.</p>
  </div>;
}
