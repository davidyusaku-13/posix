import React, { useState } from 'react'
import { ProductCatalog } from '../../components/ProductCatalog'
import { Cart } from '../../components/Cart'
import { PaymentModal } from '../../components/PaymentModal'
import { ReceiptModal } from '../../components/ReceiptModal'
import type { CheckoutResponse, Product } from '../../types/pos'
import { posApi } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface RegisterPageProps {
  products: Product[]
  isLoading: boolean
  onRefreshProducts: () => void
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  products,
  isLoading,
  onRefreshProducts,
}) => {
  const { currentUser } = useAuth()
  const { cart, totalCents, addToCart, updateQuantity, removeItem, clearCart } = useCart()
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<CheckoutResponse | null>(null)

  const handleBarcodeScan = async (code: string): Promise<boolean> => {
    try {
      const product = await posApi.lookupByCode(code)
      if (!product) return false
      addToCart(product)
      return true
    } catch {
      return false
    }
  }

  const handleConfirmPayment = async (
    paymentMethod: 'cash' | 'card',
    amountTenderedCents: number
  ) => {
    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }))

    const receipt = await posApi.createOrder(
      items,
      {
        method: paymentMethod,
        amountTenderedCents,
      },
      currentUser ? { id: currentUser.id, name: currentUser.name } : undefined
    )

    setCompletedReceipt(receipt)
    setIsPaymentOpen(false)
    clearCart()
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
            onAddToCart={addToCart}
            onBarcodeScan={handleBarcodeScan}
          />
        )}
      </section>

      {/* Right 5 cols: Active Cart & Total */}
      <section className="col-span-5 h-full overflow-hidden">
        <Cart
          items={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
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
