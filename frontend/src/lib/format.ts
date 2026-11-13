/**
 * Deterministic number formatting utility to prevent SSR/client hydration mismatches.
 */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  const parts = n.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function formatInteger(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatDecimal(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "0.00";
  return Number(n).toFixed(decimals);
}
