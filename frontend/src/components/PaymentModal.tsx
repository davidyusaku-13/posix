import React, { useState } from 'react'
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Payment Checkout</h3>
            <p className="text-xs text-slate-400">Select payment method and complete order</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Amount Due Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Total Amount Due
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono font-mono-nums mt-0.5">
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
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition ${
                method === 'cash'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Banknote className="w-4 h-4" />
              Cash
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('card')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition ${
                method === 'card'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Credit / Debit Card
            </button>
          </div>

          {/* Method Content */}
          {method === 'cash' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cash Tendered ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashTenderedStr}
                    onChange={(e) => setCashTenderedStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-lg font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalCents)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-mono text-slate-200 border border-slate-700"
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
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-mono text-slate-200 border border-slate-700"
                    >
                      {formatCents(preset)}
                    </button>
                  )
                })}
              </div>

              {/* Computed Change */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">Change Due:</span>
                <span
                  className={`font-mono text-lg font-bold ${
                    changeCents < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {changeCents < 0
                    ? `Underpaid ${formatCents(Math.abs(changeCents))}`
                    : formatCents(changeCents)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-slate-200">Terminal Ready</p>
              <p className="text-xs text-slate-400">
                Customer will tap/insert card for exact total of{' '}
                <span className="font-mono text-emerald-400 font-bold">
                  {formatCents(totalCents)}
                </span>
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (method === 'cash' && !isCashSufficient)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg shadow transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : 'Complete Sale'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
