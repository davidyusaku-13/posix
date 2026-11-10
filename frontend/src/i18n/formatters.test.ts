import { describe, expect, it } from 'bun:test'
import { formatCurrency, formatDateTime, interpolate } from './formatters'

describe('i18n formatters', () => {
  describe('formatCurrency', () => {
    it('formats USD in English locale with two decimal places', () => {
      const res = formatCurrency(1250, 'en', 'USD')
      expect(res).toBe('$12.50')
    })

    it('formats USD in Indonesian locale with comma decimal', () => {
      const res = formatCurrency(1250, 'id', 'USD')
      // id-ID Intl uses non-breaking spaces and comma decimals
      expect(res.replace(/\s+/g, ' ')).toMatch(/US\$|12,50/)
    })

    it('formats IDR in Indonesian locale with period thousands separator', () => {
      const res = formatCurrency(15000, 'id', 'IDR')
      expect(res).toBe('Rp 15.000')
    })

    it('formats IDR in English locale with comma thousands separator', () => {
      const res = formatCurrency(15000, 'en', 'IDR')
      expect(res).toBe('Rp 15,000')
    })

    it('handles zero amount correctly', () => {
      expect(formatCurrency(0, 'en', 'USD')).toBe('$0.00')
      expect(formatCurrency(0, 'id', 'IDR')).toBe('Rp 0')
    })
  })

  describe('interpolate', () => {
    it('replaces single parameter placeholder', () => {
      const text = interpolate('Hello, {name}!', { name: 'Alice' })
      expect(text).toBe('Hello, Alice!')
    })

    it('replaces multiple parameters', () => {
      const text = interpolate('Charge {total} for {count} items', {
        total: '$25.00',
        count: 3,
      })
      expect(text).toBe('Charge $25.00 for 3 items')
    })

    it('returns template as-is when no parameters are provided', () => {
      expect(interpolate('Plain string')).toBe('Plain string')
    })

    it('preserves undefined parameter tokens', () => {
      const text = interpolate('{existing} and {missing}', { existing: 'A' })
      expect(text).toBe('A and {missing}')
    })
  })

  describe('formatDateTime', () => {
    it('formats ISO timestamps', () => {
      const dateStr = '2026-11-10T08:30:00Z'
      const enRes = formatDateTime(dateStr, 'en')
      const idRes = formatDateTime(dateStr, 'id')

      expect(enRes.length).toBeGreaterThan(0)
      expect(idRes.length).toBeGreaterThan(0)
    })

    it('returns em-dash for invalid date or year 1 zero date', () => {
      expect(formatDateTime('invalid-date')).toBe('—')
      expect(formatDateTime('0001-01-01T00:00:00Z')).toBe('—')
    })
  })
})
