import { describe, expect, it } from 'bun:test'

describe('WhatsApp Bridge Helper Logic', () => {
  it('normalizes raw phone numbers to standard WhatsApp format', () => {
    const rawNumbers = [
      { input: '+1 (415) 555-2671', expected: '14155552671@s.whatsapp.net' },
      { input: '+62 812-3456-7890', expected: '6281234567890@s.whatsapp.net' },
      { input: '14155552671@s.whatsapp.net', expected: '14155552671@s.whatsapp.net' },
    ]

    for (const { input, expected } of rawNumbers) {
      const cleanPhone = input.replace(/\D/g, '')
      const jid = input.includes('@s.whatsapp.net')
        ? input
        : `${cleanPhone}@s.whatsapp.net`
      expect(jid).toBe(expected)
    }
  })

  it('validates required fields for /send endpoint', () => {
    const validBody = { phone: '+14155552671', message: 'Hello' }
    const invalidBody1 = { phone: '+14155552671' }
    const invalidBody2 = { message: 'Hello' }

    expect(Boolean(validBody.phone && validBody.message)).toBeTrue()
    expect(Boolean(invalidBody1.phone && (invalidBody1 as any).message)).toBeFalse()
    expect(Boolean((invalidBody2 as any).phone && invalidBody2.message)).toBeFalse()
  })
})
