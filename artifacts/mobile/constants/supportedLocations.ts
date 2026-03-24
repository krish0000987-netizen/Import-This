// Auto-generated from india_locations JSON

export const SUPPORTED_STATES = new Set([
  "Uttar Pradesh",
  "Delhi",
  "NCT of Delhi",
  "National Capital Territory of Delhi",
  "Haryana",
  "Bihar",
  "Uttarakhand",
]);

export function isStateSupported(state: string | undefined): boolean {
  if (!state) return false;
  const s = state.trim();
  return SUPPORTED_STATES.has(s) || s.toLowerCase().includes("delhi");
}

export const SUPPORTED_STATE_LABELS = ["Uttar Pradesh", "Delhi", "Haryana", "Bihar", "Uttarakhand"];
