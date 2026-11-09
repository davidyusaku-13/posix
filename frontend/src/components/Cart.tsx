import React, { useState } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import type { CartItem } from '../types/pos'
import { computeTaxCents } from '../utils/format'
import { useI18n } from '../context/I18nContext'
import { ConfirmModal } from './common/ConfirmModal'

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
  const { t, dict, formatCurrency } = useI18n()
  const [showVoidModal, setShowVoidModal] = useState(false)

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

  const handleConfirmVoid = () => {
    onClearCart()
    setShowVoidModal(false)
  }

  return (
    <div className="flex flex-col h-full bg-card p-4 justify-between border-l border-border">
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-wide">{dict.cart.title}</h2>
          <span className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-none font-mono font-semibold border border-border">
            {totalItemCount === 1
              ? t('cart.itemCount', { count: totalItemCount })
              : t('cart.itemsCount', { count: totalItemCount })}
          </span>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowVoidModal(true)}
            className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1 hover:bg-destructive/10 px-2 py-1 rounded-none transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {dict.cart.clearCart}
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <ShoppingCart className="w-12 h-12 stroke-[1.2] opacity-30" />
            <p className="text-sm font-semibold text-foreground/80">{dict.cart.emptyTitle}</p>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              {dict.cart.emptySubtitle}
            </p>
          </div>
        ) : (
          items.map(({ product, quantity }) => {
            const lineSubtotal = product.priceCents * quantity
            return (
              <div
                key={product.id}
                className="bg-muted/30 hover:bg-muted/50 border border-border rounded-none p-2.5 flex items-center justify-between shadow-2xs transition"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="text-sm font-bold text-foreground truncate">{product.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                    <span>{formatCurrency(product.priceCents)} ea</span>
                    <span>•</span>
                    <span className="text-muted-foreground/80 font-medium">{product.sku}</span>
                  </div>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-card border border-border rounded-none shadow-2xs">
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono text-sm font-bold text-foreground">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stockQuantity}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-none disabled:opacity-30 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-18 text-right font-mono font-bold text-sm text-foreground">
                    {formatCurrency(lineSubtotal)}
                  </div>

                  {/* Remove line */}
                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
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
      <div className="pt-3 border-t border-border space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{dict.cart.subtotal}</span>
            <span className="font-mono font-semibold text-foreground">{formatCurrency(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{dict.cart.tax} (8.25%)</span>
            <span className="font-mono font-semibold text-foreground">{formatCurrency(taxCents)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span className="text-foreground">{dict.cart.total}</span>
            <span className="font-mono text-primary text-2xl font-extrabold font-mono-nums">
              {formatCurrency(totalCents)}
            </span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold rounded-none shadow-md flex items-center justify-center gap-2 text-base transition-all active:scale-[0.99]"
        >
          <span>
            {items.length > 0
              ? t('cart.checkout', { total: formatCurrency(totalCents) })
              : dict.cart.title}
          </span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Reusable Void Order Confirmation Modal */}
      <ConfirmModal
        isOpen={showVoidModal}
        title={dict.cart.clearCartConfirmTitle}
        description={
          <>
            {dict.cart.clearCartConfirmMessage} (
            <strong className="text-foreground font-mono">
              {totalItemCount === 1
                ? t('cart.itemCount', { count: totalItemCount })
                : t('cart.itemsCount', { count: totalItemCount })}
            </strong>{' '}
            • {formatCurrency(totalCents)})
          </>
        }
        cancelLabel={dict.common.cancel}
        confirmLabel={dict.cart.clearCart}
        variant="danger"
        confirmIcon={<Trash2 className="w-3.5 h-3.5" />}
        onCancel={() => setShowVoidModal(false)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  )
}
