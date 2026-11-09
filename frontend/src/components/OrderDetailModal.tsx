import React from 'react'
import { X, Printer, Receipt, Banknote, CreditCard } from 'lucide-react'
import type { CheckoutResponse } from '../types/pos'
import { formatCents } from '../utils/format'

interface OrderDetailModalProps {
  orderDetail: CheckoutResponse
  onClose: () => void
  onReprint: (receipt: CheckoutResponse) => void
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderDetail,
  onClose,
  onReprint,
}) => {
  const { order, items, payment } = orderDetail

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Order Audit: {order.receiptNumber}
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {order.status}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Line items table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Itemized Line Items ({items.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: #{item.productId}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCents(item.unitPriceCents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCents(item.lineSubtotalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-800">{formatCents(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax Amount</span>
              <span className="font-mono font-semibold text-slate-800">{formatCents(order.taxCents)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="font-mono text-emerald-700 font-bold text-lg">{formatCents(order.totalCents)}</span>
            </div>
          </div>

          {/* Payment Settlement Information */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs bg-white">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              {payment.paymentMethod === 'cash' ? (
                <Banknote className="w-4 h-4 text-emerald-600" />
              ) : (
                <CreditCard className="w-4 h-4 text-emerald-600" />
              )}
              Payment Settlement
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Method</span>
                <span className="font-bold text-slate-800 uppercase">{payment.paymentMethod}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Tendered</span>
                <span className="font-mono font-bold text-slate-900">{formatCents(payment.amountTenderedCents)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Change Returned</span>
                <span className="font-mono font-bold text-emerald-700">{formatCents(payment.changeCents)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reference</span>
                <span className="font-mono text-slate-700">{payment.referenceCode || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            Close
          </button>
          <button
            onClick={() => onReprint(orderDetail)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Reprint Receipt</span>
          </button>
        </div>
      </div>
    </div>
  )
}
