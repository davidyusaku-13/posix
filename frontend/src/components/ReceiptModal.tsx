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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Success header */}
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            <div>
              <h3 className="font-bold text-base leading-tight">Order Completed</h3>
              <p className="text-xs text-emerald-100 font-mono">{order.receiptNumber}</p>
            </div>
          </div>
        </div>

        {/* Receipt Paper View */}
        <div className="p-5 flex justify-center bg-slate-950">
          <div className="receipt-paper w-full p-4 rounded text-xs shadow space-y-3">
            {/* Store title */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400">
              <h2 className="font-bold text-sm tracking-widest uppercase">POSIX RETAIL</h2>
              <p className="text-[10px] text-gray-600">Local POS Terminal #1</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-gray-400">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-[10px] text-gray-600">
                      {item.quantity} x {formatCents(item.unitPriceCents)}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-right">
                    {formatCents(item.lineSubtotalCents)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-mono">{formatCents(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Sales Tax</span>
                <span className="font-mono">{formatCents(order.taxCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-400">
                <span>TOTAL</span>
                <span className="font-mono">{formatCents(order.totalCents)}</span>
              </div>
            </div>

            {/* Payment & Change breakdown */}
            <div className="pt-2 border-t border-dashed border-gray-400 space-y-0.5 text-[10px] text-gray-700">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="uppercase font-semibold">{payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Tendered</span>
                <span className="font-mono">{formatCents(payment.amountTenderedCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-[11px] pt-0.5">
                <span>Change Due</span>
                <span className="font-mono">{formatCents(payment.changeCents)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed border-gray-400 text-[10px] text-gray-500">
              <p>Thank you for shopping with us!</p>
              <p className="font-mono text-[9px] mt-0.5">posix-v1 • standalone offline</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow"
            autoFocus
          >
            <span>Next Customer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
