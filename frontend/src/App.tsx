import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { ProductCatalog } from './components/ProductCatalog'
import { Cart } from './components/Cart'
import { PaymentModal } from './components/PaymentModal'
import { ReceiptModal } from './components/ReceiptModal'
import type { Product, CartItem, CheckoutResponse } from './types/pos'
import { posApi } from './services/api'
import { computeTaxCents } from './utils/format'

export function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<CheckoutResponse | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await posApi.getProducts()
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const max = item.product.stockQuantity
          return { ...item, quantity: Math.min(quantity, max) }
        }
        return item
      })
    )
  }

  const handleRemoveItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleClearCart = () => {
    setCart([])
  }

  // Fast Barcode / SKU scan handler
  const handleBarcodeScan = async (code: string): Promise<boolean> => {
    try {
      const product = await posApi.lookupByCode(code)
      if (!product) return false
      handleAddToCart(product)
      return true
    } catch {
      return false
    }
  }

  // Cart grand total
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

  // Payment & Checkout
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
    setCart([])
    // Refresh inventory counts
    await loadProducts()
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Header onReset={handleClearCart} onRefreshCatalog={loadProducts} />

      <main className="flex-1 grid grid-cols-12 min-h-0">
        {/* Left 7 cols: Product Catalog & Barcode Scanner */}
        <section className="col-span-7 h-full overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500 font-mono">
              Loading POS catalog...
            </div>
          ) : (
            <ProductCatalog
              products={products}
              onAddToCart={handleAddToCart}
              onBarcodeScan={handleBarcodeScan}
            />
          )}
        </section>

        {/* Right 5 cols: Active Cart & Total */}
        <section className="col-span-5 h-full overflow-hidden">
          <Cart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={() => setIsPaymentOpen(true)}
          />
        </section>
      </main>

      {/* Payment Dialog Modal */}
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

export default App
