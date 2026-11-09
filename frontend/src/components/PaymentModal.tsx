import React, { useState, useEffect } from 'react'
import { Banknote, CreditCard, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface PaymentModalProps {
  totalCents: number
  onClose: () => void
  onConfirmPayment: (paymentMethod: 'cash' | 'card', amountTenderedCents: number) => Promise<void>
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalCents,
  onClose,
  onConfirmPayment,
}) => {
  const { t, dict, currency, formatCurrency } = useI18n()
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [cashTenderedStr, setCashTenderedStr] = useState<string>(
    currency === 'IDR' ? String(totalCents) : (totalCents / 100).toFixed(2)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Convert input string to integer cents
  const tenderedCents =
    currency === 'IDR'
      ? Math.round(parseFloat(cashTenderedStr) || 0)
      : Math.round((parseFloat(cashTenderedStr) || 0) * 100)
  const changeCents = tenderedCents - totalCents
  const isCashSufficient = tenderedCents >= totalCents

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isSubmitting])

  const handleQuickCash = (cents: number) => {
    setCashTenderedStr(currency === 'IDR' ? String(cents) : (cents / 100).toFixed(2))
    setErrorMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (method === 'cash' && !isCashSufficient) {
      setErrorMsg(
        t('payment.underpaidWarning', {
          remaining: formatCurrency(Math.abs(changeCents)),
        })
      )
      return
    }

    setIsSubmitting(true)
    try {
      const finalTendered = method === 'cash' ? tenderedCents : totalCents
      await onConfirmPayment(method, finalTendered)
    } catch (err: any) {
      setErrorMsg(err.message || dict.payment.insufficient)
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 w-full max-w-md rounded-none shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{dict.payment.title}</h3>
            <p className="text-xs text-slate-500">{dict.payment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Amount Due Banner */}
          <div className="bg-[#fdf3e7] border border-[#f4d3a8] rounded-none p-4 text-center">
            <span className="text-xs text-[#8f4d08] uppercase tracking-wider font-bold">
              {dict.cart.total}
            </span>
            <div className="text-3xl font-extrabold text-primary font-mono font-mono-nums mt-0.5">
              {formatCurrency(totalCents)}
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMethod('cash')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-none border text-sm font-bold transition shadow-2xs ${
                method === 'cash'
                  ? 'bg-[#f5efe6] border-2 border-primary text-primary'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4 stroke-[2.5]" />
              {dict.payment.cash}
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('card')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-none border text-sm font-bold transition shadow-2xs ${
                method === 'card'
                  ? 'bg-[#f5efe6] border-2 border-primary text-primary'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              {dict.payment.card}
            </button>
          </div>

          {/* Method Content */}
          {method === 'cash' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {dict.payment.amountTendered} ({currency === 'IDR' ? 'Rp' : '$'})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-lg">
                    {currency === 'IDR' ? 'Rp' : '$'}
                  </span>
                  <input
                    type="number"
                    step={currency === 'IDR' ? '1000' : '0.01'}
                    min="0"
                    value={cashTenderedStr}
                    onChange={(e) => setCashTenderedStr(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 bg-white border-2 border-slate-300 focus:border-primary rounded-none text-xl font-mono font-bold text-slate-900 focus:outline-none shadow-xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalCents)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs rounded-none font-mono font-semibold text-slate-800 border border-slate-300 shadow-2xs transition"
                >
                  {dict.payment.exact} ({formatCurrency(totalCents)})
                </button>
                {(currency === 'IDR'
                  ? [50000, 100000, 200000, 500000]
                  : [1000, 2000, 5000, 10000]
                ).map((preset) => {
                  if (preset < totalCents) return null
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickCash(preset)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs rounded-none font-mono font-semibold text-slate-800 border border-slate-300 shadow-2xs transition"
                    >
                      {formatCurrency(preset)}
                    </button>
                  )
                })}
              </div>

              {/* Computed Change */}
              <div className="bg-slate-50 border border-slate-200 rounded-none p-3.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">{dict.payment.changeDue}:</span>
                <span
                  className={`font-mono text-xl font-extrabold ${
                    changeCents < 0 ? 'text-rose-600' : 'text-primary'
                  }`}
                >
                  {changeCents < 0
                    ? `${dict.payment.insufficient} (${formatCurrency(Math.abs(changeCents))})`
                    : formatCurrency(changeCents)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-none p-6 text-center space-y-2">
              <CreditCard className="w-10 h-10 text-primary mx-auto" />
              <p className="text-base font-bold text-slate-900">{dict.payment.card}</p>
              <p className="text-xs text-slate-500">
                {formatCurrency(totalCents)}
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-none text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-none text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (method === 'cash' && !isCashSufficient)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-primary-foreground font-bold text-sm rounded-none shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? dict.payment.processing : dict.payment.completePayment}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
