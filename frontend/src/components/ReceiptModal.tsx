import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, CheckCircle, ArrowRight, X } from 'lucide-react'
import type { CheckoutResponse } from '../types/pos'
import { formatCents } from '../utils/format'

interface ReceiptModalProps {
  receipt: CheckoutResponse
  onNewSale: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onNewSale }) => {
  const { order, items, payment } = receipt

  // Add body class while receipt modal is open to isolate print stylesheet
  useEffect(() => {
    document.body.classList.add('has-receipt-modal')
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNewSale()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('has-receipt-modal')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onNewSale])

  const handlePrint = () => {
    window.print()
  }

  const modalContent = (
    <div
      id="receipt-modal-portal"
      role="dialog"
      aria-modal="true"
      onClick={onNewSale}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:static print:p-0 print:bg-transparent print:backdrop-blur-none print:block"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 w-full max-w-sm rounded-none shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-[80mm] print:mx-auto print:rounded-none"
      >
        {/* Success header - Hidden in Print */}
        <div className="bg-primary px-6 py-4 text-primary-foreground flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            <div>
              <h3 className="font-bold text-base leading-tight">Order Completed</h3>
              <p className="text-xs text-primary-foreground/80 font-mono font-medium">{order.receiptNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNewSale}
            className="p-1 rounded-none text-primary-foreground/80 hover:text-primary-foreground hover:bg-black/20 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Paper View */}
        <div className="p-5 flex justify-center bg-slate-100/70 print:p-0 print:bg-transparent">
          <div className="receipt-paper w-full p-4 rounded-none text-xs shadow-xs space-y-3 bg-white print:p-0 print:shadow-none print:border-none print:rounded-none">
            {/* Store title */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300 print:border-slate-800">
              <h2 className="font-extrabold text-sm tracking-widest uppercase text-slate-900">POSIX RETAIL</h2>
              <p className="text-[10px] text-slate-500 font-medium">Local POS Terminal #1</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 print:text-slate-600">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 py-1.5 border-b border-dashed border-slate-300 print:border-slate-800">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="font-bold text-slate-800">{item.productName}</div>
                    <div className="text-[10px] text-slate-500 print:text-slate-600">
                      {item.quantity} x {formatCents(item.unitPriceCents)}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-right text-slate-900">
                    {formatCents(item.lineSubtotalCents)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-slate-600 print:text-slate-800">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">{formatCents(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600 print:text-slate-800">
                <span>Sales Tax</span>
                <span className="font-mono font-semibold text-slate-800">{formatCents(order.taxCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-slate-300 print:border-slate-800 text-slate-900">
                <span>TOTAL</span>
                <span className="font-mono text-sm">{formatCents(order.totalCents)}</span>
              </div>
            </div>

            {/* Payment & Change breakdown */}
            <div className="pt-2 border-t border-dashed border-slate-300 print:border-slate-800 space-y-0.5 text-[10px] text-slate-600 print:text-slate-800">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="uppercase font-bold text-slate-800">{payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Tendered</span>
                <span className="font-mono font-semibold text-slate-800">{formatCents(payment.amountTenderedCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-[11px] pt-1">
                <span>Change Due</span>
                <span className="font-mono text-primary print:text-slate-900">{formatCents(payment.changeCents)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-300 print:border-slate-800 text-[10px] text-slate-400 print:text-slate-600">
              <p>Thank you for shopping with us!</p>
              <p className="font-mono text-[9px] mt-0.5">posix-v1 • standalone offline</p>
            </div>
          </div>
        </div>

        {/* Modal Actions - Hidden in Print */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-none flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-none flex items-center justify-center gap-1.5 transition shadow-md active:scale-95"
            autoFocus
          >
            <span>Next Customer</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
