import React, { useState } from 'react'
import { ProductCatalog } from '../../components/ProductCatalog'
import { Cart } from '../../components/Cart'
import { PaymentModal } from '../../components/PaymentModal'
import { ReceiptModal } from '../../components/ReceiptModal'
import type { CartItem, CheckoutResponse, Product } from '../../types/pos'
import { posApi } from '../../services/api'
import { computeTaxCents } from '../../utils/format'

interface RegisterPageProps {
  products: Product[]
  isLoading: boolean
  onRefreshProducts: () => void
  cart: CartItem[]
  onAddToCart: (product: Product) => void
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onClearCart: () => void
  onBarcodeScan: (code: string) => Promise<boolean>
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  products,
  isLoading,
  onRefreshProducts,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onBarcodeScan,
}) => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<CheckoutResponse | null>(null)

  // Totals
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )
  const taxCents = cart.reduce(
    (sum, item) =>
      sum + computeTaxCents(item.product.priceCents * item.quantity, item.product.taxRateBps),
    0
  )
  const totalCents = subtotalCents + taxCents

  const handleConfirmPayment = async (
    paymentMethod: 'cash' | 'card',
    amountTenderedCents: number
  ) => {
    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }))

    const receipt = await posApi.createOrder(items, {
      method: paymentMethod,
      amountTenderedCents,
    })

    setCompletedReceipt(receipt)
    setIsPaymentOpen(false)
    onClearCart()
    onRefreshProducts()
  }

  return (
    <div className="grid grid-cols-12 h-full overflow-hidden">
      {/* Left 7 cols: Product Catalog & Barcode Scanner */}
      <section className="col-span-7 h-full overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-mono">
            Loading POS catalog...
          </div>
        ) : (
          <ProductCatalog
            products={products}
            onAddToCart={onAddToCart}
            onBarcodeScan={onBarcodeScan}
          />
        )}
      </section>

      {/* Right 5 cols: Active Cart & Total */}
      <section className="col-span-5 h-full overflow-hidden">
        <Cart
          items={cart}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onClearCart={onClearCart}
          onCheckout={() => setIsPaymentOpen(true)}
        />
      </section>

      {/* Payment Checkout Modal */}
      {isPaymentOpen && (
        <PaymentModal
          totalCents={totalCents}
          onClose={() => setIsPaymentOpen(false)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Receipt Modal (Post Checkout) */}
      {completedReceipt && (
        <ReceiptModal
          receipt={completedReceipt}
          onNewSale={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  )
}
