import React, { useEffect } from 'react'
import { X, Printer, Receipt, Banknote, CreditCard } from 'lucide-react'
import type { CheckoutResponse } from '../types/pos'
import { useI18n } from '../context/I18nContext'

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
  const { dict, formatCurrency, formatDate } = useI18n()
  const { order, items, payment } = orderDetail

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 w-full max-w-lg rounded-none shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Order Audit: {order.receiptNumber}
                <span className="text-[10px] uppercase font-bold text-primary bg-[#f5efe6] border border-[#e2d7c8] px-2 py-0.5 rounded-none">
                  {order.status}
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                <span>{formatDate(order.createdAt)}</span>
                {order.cashierName && (
                  <span className="text-slate-700 font-sans font-semibold">
                    • {dict.orders.colCashier}: <span className="font-bold text-primary">{order.cashierName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
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
            <div className="border border-slate-200 rounded-none overflow-hidden shadow-2xs">
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
                        {formatCurrency(item.unitPriceCents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.lineSubtotalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-none p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{dict.cart.subtotal}</span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{dict.cart.tax}</span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(order.taxCents)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>{dict.cart.total}</span>
              <span className="font-mono text-primary font-bold text-lg">{formatCurrency(order.totalCents)}</span>
            </div>
          </div>

          {/* Payment Settlement Information */}
          <div className="border border-slate-200 rounded-none p-4 space-y-2 text-xs bg-white">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              {payment.paymentMethod === 'cash' ? (
                <Banknote className="w-4 h-4 text-primary" />
              ) : (
                <CreditCard className="w-4 h-4 text-primary" />
              )}
              {dict.receipt.paymentMethod}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{dict.receipt.paymentMethod}</span>
                <span className="font-bold text-slate-800 uppercase">{payment.paymentMethod}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{dict.receipt.tendered}</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(payment.amountTenderedCents)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{dict.receipt.change}</span>
                <span className="font-mono font-bold text-primary">{formatCurrency(payment.changeCents)}</span>
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
            className="px-4 py-2 rounded-none text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            {dict.common.close}
          </button>
          <button
            onClick={() => onReprint(orderDetail)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{dict.receipt.printReceipt}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
