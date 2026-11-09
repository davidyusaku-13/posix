import React, { useState, useEffect } from 'react'
import { Banknote, CreditCard, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCents } from '../utils/format'

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
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [cashTenderedStr, setCashTenderedStr] = useState<string>((totalCents / 100).toFixed(2))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Convert input dollars string to integer cents
  const tenderedCents = Math.round((parseFloat(cashTenderedStr) || 0) * 100)
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
    setCashTenderedStr((cents / 100).toFixed(2))
    setErrorMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (method === 'cash' && !isCashSufficient) {
      setErrorMsg(`Amount tendered is insufficient. Need at least ${formatCents(totalCents)}`)
      return
    }

    setIsSubmitting(true)
    try {
      const finalTendered = method === 'cash' ? tenderedCents : totalCents
      await onConfirmPayment(method, finalTendered)
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment failed')
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
            <h3 className="text-lg font-bold text-slate-900">Payment Checkout</h3>
            <p className="text-xs text-slate-500">Select payment method and complete order</p>
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
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-none p-4 text-center">
            <span className="text-xs text-emerald-800 uppercase tracking-wider font-bold">
              Total Amount Due
            </span>
            <div className="text-3xl font-extrabold text-emerald-700 font-mono font-mono-nums mt-0.5">
              {formatCents(totalCents)}
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
                  ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4 stroke-[2.5]" />
              Cash
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('card')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-none border text-sm font-bold transition shadow-2xs ${
                method === 'card'
                  ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              Credit / Debit Card
            </button>
          </div>

          {/* Method Content */}
          {method === 'cash' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash Tendered ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashTenderedStr}
                    onChange={(e) => setCashTenderedStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-none text-xl font-mono font-bold text-slate-900 focus:outline-none shadow-xs"
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
                  Exact ({formatCents(totalCents)})
                </button>
                {[1000, 2000, 5000, 10000].map((preset) => {
                  if (preset < totalCents) return null
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickCash(preset)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs rounded-none font-mono font-semibold text-slate-800 border border-slate-300 shadow-2xs transition"
                    >
                      {formatCents(preset)}
                    </button>
                  )
                })}
              </div>

              {/* Computed Change */}
              <div className="bg-slate-50 border border-slate-200 rounded-none p-3.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Change Due:</span>
                <span
                  className={`font-mono text-xl font-extrabold ${
                    changeCents < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {changeCents < 0
                    ? `Underpaid ${formatCents(Math.abs(changeCents))}`
                    : formatCents(changeCents)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-none p-6 text-center space-y-2">
              <CreditCard className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-base font-bold text-slate-900">Terminal Ready</p>
              <p className="text-xs text-slate-500">
                Customer will tap/insert card for exact total of{' '}
                <span className="font-mono text-emerald-700 font-bold text-sm">
                  {formatCents(totalCents)}
                </span>
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (method === 'cash' && !isCashSufficient)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-none shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : 'Complete Sale'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
