import React from 'react'
import { useI18n } from '../../context/I18nContext'

interface LanguageSwitcherProps {
  compact?: boolean
  showCurrency?: boolean
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  showCurrency = true,
}) => {
  const { locale, setLocale, currency, setCurrency } = useI18n()

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs select-none">
      {/* Language Switcher */}
      <div className="flex items-center border border-border bg-card rounded-none overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setLocale('en')}
          title="Switch to English"
          className={`px-2 py-1 text-[11px] font-bold transition ${
            locale === 'en'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocale('id')}
          title="Ganti ke Bahasa Indonesia"
          className={`px-2 py-1 text-[11px] font-bold transition border-l border-border ${
            locale === 'id'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          ID
        </button>
      </div>

      {/* Currency Switcher */}
      {showCurrency && (
        <div className="flex items-center border border-border bg-card rounded-none overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            title="Currency: US Dollar ($)"
            className={`px-2 py-1 text-[11px] font-bold transition ${
              currency === 'USD'
                ? 'bg-[#f5efe6] text-primary border-[#e2d7c8] font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            $
          </button>
          <button
            type="button"
            onClick={() => setCurrency('IDR')}
            title="Mata Uang: Rupiah (Rp)"
            className={`px-2 py-1 text-[11px] font-bold transition border-l border-border ${
              currency === 'IDR'
                ? 'bg-[#f5efe6] text-primary border-[#e2d7c8] font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Rp
          </button>
        </div>
      )}
    </div>
  )
}
