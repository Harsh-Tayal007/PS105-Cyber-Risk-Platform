/**
 * Number and currency formatting utilities for PS105.
 * Currency follows Indian numbering convention (Lakh / Cr).
 */

export function getCurrencyPref(): 'auto' | 'lakh' | 'crore' {
  if (typeof window === 'undefined') return 'auto';
  try {
    const pref = localStorage.getItem('ps105_currency_pref');
    if (pref === 'lakh' || pref === 'crore') return pref;
  } catch {
    // Ignore storage errors
  }
  return 'auto';
}

export function formatINR(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '₹0';
  }

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const pref = getCurrencyPref();

  if (pref === 'crore' && abs >= 1e5) {
    const cr = abs / 1e7;
    return `${sign}₹${cr.toFixed(2)} Cr`;
  }

  if (pref === 'lakh' && abs >= 1e4 && abs < 99.995 * 1e5) {
    const lakhs = abs / 1e5;
    return `${sign}₹${lakhs.toFixed(2)} Lakh`;
  }

  // Auto mode (default):
  // Below 1 Lakh: e.g. "₹1,234"
  if (abs < 1e5) {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(Math.round(abs));
    return `${sign}₹${formatted}`;
  }

  // From 1e5 up to < 1e7: "₹X.XX Lakh"
  if (abs < 1e7) {
    const lakhs = abs / 1e5;
    // Never display "Lakhs" numbers above 99; convert to Cr if rounding reaches 100.00
    if (lakhs >= 99.995) {
      const cr = abs / 1e7;
      return `${sign}₹${cr.toFixed(2)} Cr`;
    }
    return `${sign}₹${lakhs.toFixed(2)} Lakh`;
  }

  // 1e7 and above (1 Crore+): "₹X.XX Cr"
  const cr = abs / 1e7;
  return `${sign}₹${cr.toFixed(2)} Cr`;
}

export function formatPercent(value: number, digits: number = 1): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(digits)}%`;
}

// Backward-compatible alias for existing components
export const formatLakhs = formatINR;
