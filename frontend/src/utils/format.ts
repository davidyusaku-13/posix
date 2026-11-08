// Converts integer cents to formatted currency (e.g. 1250 -> "$12.50")
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Compute line tax: (lineSubtotal * taxRateBps + 5000) / 10000
export function computeTaxCents(subtotalCents: number, taxRateBps: number): number {
  if (subtotalCents <= 0 || taxRateBps <= 0) return 0
  return Math.floor((subtotalCents * taxRateBps + 5000) / 10000)
}
