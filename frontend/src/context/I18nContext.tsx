import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  dictionaries,
  formatCurrency as formatCurrencyUtil,
  formatDateTime,
  interpolate,
  type SupportedCurrency,
  type SupportedLocale,
  type TranslationSchema,
} from '../i18n'

const STORAGE_LANG_KEY = 'posix_language'
const STORAGE_CURRENCY_KEY = 'posix_currency'

interface I18nContextValue {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
  currency: SupportedCurrency
  setCurrency: (currency: SupportedCurrency) => void
  t: (keyPath: string, params?: Record<string, string | number>) => string
  formatCurrency: (cents: number, overrideCurrency?: SupportedCurrency) => string
  formatDate: (dateInput: string | Date | number) => string
  dict: TranslationSchema
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectInitialLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_LANG_KEY)
  if (saved === 'en' || saved === 'id') {
    return saved
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('id')) {
      return 'id'
    }
  }
  return 'en'
}

function detectInitialCurrency(locale: SupportedLocale): SupportedCurrency {
  const saved = localStorage.getItem(STORAGE_CURRENCY_KEY)
  if (saved === 'USD' || saved === 'IDR') {
    return saved
  }
  return locale === 'id' ? 'IDR' : 'USD'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectInitialLocale)
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() =>
    detectInitialCurrency(detectInitialLocale())
  )

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_LANG_KEY, newLocale)

    // If user hasn't explicitly set a custom currency, align with new locale default
    if (!localStorage.getItem(STORAGE_CURRENCY_KEY)) {
      setCurrencyState(newLocale === 'id' ? 'IDR' : 'USD')
    }
  }

  const setCurrency = (newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency)
    localStorage.setItem(STORAGE_CURRENCY_KEY, newCurrency)
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const dict = dictionaries[locale] || dictionaries.en

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const parts = keyPath.split('.')
    let current: unknown = dict

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        // Fallback to English if missing in target dictionary
        let fallback: unknown = dictionaries.en
        for (const fbPart of parts) {
          if (fallback && typeof fallback === 'object' && fbPart in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbPart]
          } else {
            return keyPath
          }
        }
        return typeof fallback === 'string' ? interpolate(fallback, params) : keyPath
      }
    }

    if (typeof current === 'string') {
      return interpolate(current, params)
    }

    return keyPath
  }

  const formatCurrency = (cents: number, overrideCurrency?: SupportedCurrency): string => {
    return formatCurrencyUtil(cents, locale, overrideCurrency || currency)
  }

  const formatDate = (dateInput: string | Date | number): string => {
    return formatDateTime(dateInput, locale)
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        currency,
        setCurrency,
        t,
        formatCurrency,
        formatDate,
        dict,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
