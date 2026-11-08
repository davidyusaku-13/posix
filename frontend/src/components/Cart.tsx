import React from 'react'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import type { CartItem } from '../types/pos'
import { formatCents, computeTaxCents } from '../utils/format'

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onClearCart: () => void
  onCheckout: () => void
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  // Compute totals
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )
  const taxCents = items.reduce(
    (sum, item) =>
      sum + computeTaxCents(item.product.priceCents * item.quantity, item.product.taxRateBps),
    0
  )
  const totalCents = subtotalCents + taxCents
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4 justify-between">
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Current Order</h2>
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono font-semibold">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:bg-rose-500/10 px-2 py-1 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Void
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <ShoppingCart className="w-12 h-12 stroke-[1.2] opacity-40" />
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-slate-600 text-center max-w-[200px]">
              Scan a barcode or click a product on the left to add items
            </p>
          </div>
        ) : (
          items.map(({ product, quantity }) => {
            const lineSubtotal = product.priceCents * quantity
            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{product.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{formatCents(product.priceCents)} ea</span>
                    <span>•</span>
                    <span className="text-slate-500">{product.sku}</span>
                  </div>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md">
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-l-md transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-bold text-slate-200">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stockQuantity}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-md disabled:opacity-30 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-18 text-right font-mono font-bold text-sm text-emerald-400">
                    {formatCents(lineSubtotal)}
                  </div>

                  {/* Remove line */}
                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cart Summary & Checkout Action */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono text-slate-200">{formatCents(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Estimated Tax (8.25%)</span>
            <span className="font-mono text-slate-200">{formatCents(taxCents)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-800/80">
            <span className="text-white">Total Due</span>
            <span className="font-mono text-emerald-400 text-xl font-mono-nums">
              {formatCents(totalCents)}
            </span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-base transition-all active:scale-[0.99]"
        >
          <span>Pay {items.length > 0 ? formatCents(totalCents) : ''}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
