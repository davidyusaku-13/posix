import type { SupportedCurrency, SupportedLocale } from './schema'

/**
 * Formats integer monetary values (cents) according to active locale and currency.
 * - Under USD: converts cents to dollars (1250 cents -> "$12.50" or "US$ 12,50").
 * - Under IDR: formats direct integer rupiah (15000 -> "Rp 15.000").
 */
export function formatCurrency(
  cents: number,
  locale: SupportedLocale = 'en',
  currency: SupportedCurrency = 'USD'
): string {
  if (currency === 'IDR') {
    const formatter = new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US')
    return `Rp ${formatter.format(cents)}`
  }

  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Formats ISO timestamps according to the active locale.
 */
export function formatDateTime(
  dateInput: string | Date | number,
  locale: SupportedLocale = 'en'
): string {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Replaces {variable} placeholders with provided parameter values.
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`
  })
}
