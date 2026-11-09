import { en } from './locales/en'
import { id } from './locales/id'
import type { SupportedLocale, TranslationSchema } from './schema'

export * from './formatters'
export * from './schema'

export const dictionaries: Record<SupportedLocale, TranslationSchema> = {
  en,
  id,
}
