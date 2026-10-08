import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  paystackPublicKey: string;
};

export type AppServices = {
  config: RuntimeConfig;
  supabase: SupabaseClient;
};

let cachedServices: AppServices | null = null;

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const envConfig: RuntimeConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "",
  };

  try {
    const response = await fetch("/api/config.js", { headers: { Accept: "application/json" } });
    if (response.ok) {
      const remote = (await response.json()) as Partial<RuntimeConfig>;
      return {
        supabaseUrl: remote.supabaseUrl || envConfig.supabaseUrl,
        supabaseAnonKey: remote.supabaseAnonKey || envConfig.supabaseAnonKey,
        paystackPublicKey: remote.paystackPublicKey || envConfig.paystackPublicKey,
      };
    }
  } catch {
    // Local Vite development can run without the Vercel function.
  }

  return envConfig;
}

export async function getAppServices(): Promise<AppServices> {
  if (cachedServices) return cachedServices;
  const config = await fetchRuntimeConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase is not configured. Add the Vercel/Supabase environment variables before using the site.");
  }
  cachedServices = { config, supabase: createClient(config.supabaseUrl, config.supabaseAnonKey) };
  return cachedServices;
}

export function clearAppServicesCache() {
  cachedServices = null;
}
