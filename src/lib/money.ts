/** Typed reais → cents: "35,50", "1.234,50", "35.5" and "35" all work. NaN when it isn't a number. */
export function parseCents(text: string): number {
  const raw = text.trim().replace(/^R\$\s*/, "");
  if (!raw) return NaN;
  // With a comma, it is the decimal separator and dots group thousands.
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

/** 3550 → "35,50" (for an input's initial text). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
