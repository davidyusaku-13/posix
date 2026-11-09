import React from 'react'
import { Printer, CheckCircle, ArrowRight } from 'lucide-react'
import type { CheckoutResponse } from '../types/pos'
import { formatCents } from '../utils/format'

interface ReceiptModalProps {
  receipt: CheckoutResponse
  onNewSale: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onNewSale }) => {
  const { order, items, payment } = receipt

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Success header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            <div>
              <h3 className="font-bold text-base leading-tight">Order Completed</h3>
              <p className="text-xs text-emerald-100 font-mono font-medium">{order.receiptNumber}</p>
            </div>
          </div>
        </div>

        {/* Receipt Paper View */}
        <div className="p-5 flex justify-center bg-slate-100/70">
          <div className="receipt-paper w-full p-4 rounded-xl text-xs shadow-xs space-y-3 bg-white">
            {/* Store title */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-sm tracking-widest uppercase text-slate-900">POSIX RETAIL</h2>
              <p className="text-[10px] text-slate-500 font-medium">Local POS Terminal #1</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 py-1.5 border-b border-dashed border-slate-300">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="font-bold text-slate-800">{item.productName}</div>
                    <div className="text-[10px] text-slate-500">
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
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">{formatCents(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax</span>
                <span className="font-mono font-semibold text-slate-800">{formatCents(order.taxCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-slate-300 text-slate-900">
                <span>TOTAL</span>
                <span className="font-mono text-sm">{formatCents(order.totalCents)}</span>
              </div>
            </div>

            {/* Payment & Change breakdown */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600">
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
                <span className="font-mono text-emerald-700">{formatCents(payment.changeCents)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
              <p>Thank you for shopping with us!</p>
              <p className="font-mono text-[9px] mt-0.5">posix-v1 • standalone offline</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow-md"
            autoFocus
          >
            <span>Next Customer</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
