import { paystackAdapter } from "./adapters/paystack.js";

// Register only adapters whose API behavior is implemented and testable.
const adapters = new Map([[paystackAdapter.key, paystackAdapter]]);

export function getAdapter(key) {
  return adapters.get(String(key || "")) || null;
}

export function listAdapters() {
  return [...adapters.values()];
}
