import { describe, expect, it } from 'bun:test'
import { en } from './locales/en'
import { id } from './locales/id'

describe('i18n dictionary completeness & symmetry', () => {
  it('has identical top-level sections in en and id', () => {
    const enSections = Object.keys(en).sort()
    const idSections = Object.keys(id).sort()
    expect(idSections).toEqual(enSections)
  })

  it('contains matching non-empty string keys for all sections', () => {
    for (const section of Object.keys(en) as (keyof typeof en)[]) {
      const enSection = en[section]
      const idSection = id[section]

      const enKeys = Object.keys(enSection).sort()
      const idKeys = Object.keys(idSection).sort()

      expect(idKeys).toEqual(enKeys)

      for (const key of enKeys) {
        const enVal = (enSection as Record<string, string>)[key]
        const idVal = (idSection as Record<string, string>)[key]

        expect(typeof enVal).toBe('string')
        expect(enVal.trim().length).toBeGreaterThan(0)

        expect(typeof idVal).toBe('string')
        expect(idVal.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
