import { formatCurrency as formatCurrencyUtil, type SupportedCurrency, type SupportedLocale } from '../i18n'

// Converts integer cents to formatted currency (e.g. 1250 -> "$12.50" or "Rp 12.500")
export function formatCents(
  cents: number,
  locale: SupportedLocale = 'en',
  currency: SupportedCurrency = 'USD'
): string {
  return formatCurrencyUtil(cents, locale, currency)
}

// Compute line tax: (lineSubtotal * taxRateBps + 5000) / 10000
export function computeTaxCents(subtotalCents: number, taxRateBps: number): number {
  if (subtotalCents <= 0 || taxRateBps <= 0) return 0
  return Math.floor((subtotalCents * taxRateBps + 5000) / 10000)
}
