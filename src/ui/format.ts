/** Singapore dollars, no cents — precision beyond the dollar is false comfort here. */
export function money(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-SG')}`;
}

/** Keeps cents, for per-month figures where dollars alone read as suspiciously round. */
export function moneyPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `$${value.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function percent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** Parses whatever the user typed into a number, tolerating $ and commas. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}
