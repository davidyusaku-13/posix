import React, { useState, useEffect, useCallback } from 'react'
import { Receipt, DollarSign, ShoppingBag, Banknote, CreditCard, RefreshCw, Eye, AlertTriangle, User } from 'lucide-react'
import type { CheckoutResponse, Order, OrdersRecap } from '../types/pos'
import { posApi } from '../services/api'
import { useI18n } from '../context/I18nContext'
import { OrderDetailModal } from './OrderDetailModal'

interface OrderHistoryProps {
  onReprintReceipt: (receipt: CheckoutResponse) => void
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onReprintReceipt }) => {
  const { dict, formatCurrency, formatDate } = useI18n()
  const [recap, setRecap] = useState<OrdersRecap | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<CheckoutResponse | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [recapData, ordersData] = await Promise.all([
        posApi.getOrdersRecap(),
        posApi.getOrders(100),
      ])
      setRecap(recapData)
      setOrders(ordersData)
    } catch (err) {
      console.error('Failed to load order history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInspectOrder = async (orderId: string) => {
    try {
      setErrorBanner(null)
      const detail = await posApi.getOrderById(orderId)
      setSelectedOrder(detail)
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load order audit')
    }
  }

  const validOrders = orders.filter((o) => !!o.cashierName && o.cashierName.trim() !== '')

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-hidden">
      {/* Top Header */}
      {errorBanner && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-none text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            {dict.orders.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {dict.orders.recapTitle}
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-none text-slate-600 hover:text-slate-900 transition shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Recap of All History (KPI Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-none p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{dict.orders.grossSales}</span>
            <div className="w-7 h-7 rounded-none bg-[#f5efe6] text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono font-mono-nums">
            {formatCurrency(recap ? recap.totalRevenueCents : 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {recap?.totalOrders || 0} completed transactions
          </div>
        </div>

        {/* Total Orders Count */}
        <div className="bg-white border border-slate-200 rounded-none p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{dict.orders.orderCount}</span>
            <div className="w-7 h-7 rounded-none bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono font-mono-nums">
            {recap?.totalOrders || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Settled orders on this register
          </div>
        </div>

        {/* Cash Settled */}
        <div className="bg-white border border-slate-200 rounded-none p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{dict.payment.cash} Volume</span>
            <div className="w-7 h-7 rounded-none bg-amber-50 text-amber-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono font-mono-nums">
            {formatCurrency(recap ? recap.totalCashCents : 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Net cash drawer collections
          </div>
        </div>

        {/* Card Settled */}
        <div className="bg-white border border-slate-200 rounded-none p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{dict.payment.card} Volume</span>
            <div className="w-7 h-7 rounded-none bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono font-mono-nums">
            {formatCurrency(recap ? recap.totalCardCents : 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Electronic debit / credit card volume
          </div>
        </div>
      </div>

      {/* Order Ledger Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-none shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {dict.orders.recapTitle} ({validOrders.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Click any row to inspect
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-4">{dict.orders.colOrder}</th>
                <th className="py-2.5 px-4">{dict.orders.colDate}</th>
                <th className="py-2.5 px-4">{dict.orders.colCashier}</th>
                <th className="py-2.5 px-4 text-right">{dict.cart.subtotal}</th>
                <th className="py-2.5 px-4 text-right">{dict.cart.tax}</th>
                <th className="py-2.5 px-4 text-right">{dict.orders.colTotal}</th>
                <th className="py-2.5 px-4 text-center">{dict.orders.colStatus}</th>
                <th className="py-2.5 px-4 text-right">{dict.inventory.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {validOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => handleInspectOrder(o.id)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {o.receiptNumber}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {formatDate(o.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {o.cashierName ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                        <User className="w-3.5 h-3.5 text-primary" />
                        {o.cashierName}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatCurrency(o.subtotalCents)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatCurrency(o.taxCents)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-primary text-sm">
                    {formatCurrency(o.totalCents)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold uppercase bg-[#f5efe6] text-primary border border-[#e2d7c8]">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInspectOrder(o.id)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-none transition shadow-2xs border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{dict.orders.viewDetails}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Receipt className="w-10 h-10 mb-2 stroke-[1.2]" />
              <p className="text-sm font-semibold text-slate-500">{dict.orders.noOrders}</p>
            </div>
          )}
        </div>
      </div>

      {/* Focused Single Order Recap Modal */}
      {selectedOrder && (
        <OrderDetailModal
          orderDetail={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReprint={onReprintReceipt}
        />
      )}
    </div>
  )
}
