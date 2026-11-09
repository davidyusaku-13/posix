import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { ProductCatalog } from './components/ProductCatalog'
import { Cart } from './components/Cart'
import { PaymentModal } from './components/PaymentModal'
import { ReceiptModal } from './components/ReceiptModal'
import { InventoryManager } from './components/InventoryManager'
import { OrderHistory } from './components/OrderHistory'
import { UserManager } from './components/UserManager'
import { LoginScreen } from './components/LoginScreen'
import type { Product, CartItem, CheckoutResponse, CreateProductInput, UpdateProductInput, User } from './types/pos'
import { posApi } from './services/api'
import { computeTaxCents } from './utils/format'

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const [activeTab, setActiveTab] = useState<'cashier' | 'inventory' | 'history' | 'users'>('cashier')
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<CheckoutResponse | null>(null)

  // Verify and restore active session on startup
  useEffect(() => {
    async function checkSession() {
      if (posApi.getToken()) {
        try {
          const user = await posApi.getMe()
          setCurrentUser(user)
        } catch {
          setCurrentUser(null)
        }
      }
      setIsCheckingAuth(false)
    }
    checkSession()
  }, [])

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
    if (currentUser) {
      loadProducts()
    }
  }, [currentUser, loadProducts])

  // RBAC Tab Guard: Ensure cashier cannot remain on manager/admin tabs
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'cashier' && activeTab !== 'cashier') {
        setActiveTab('cashier')
      } else if (currentUser.role === 'manager' && activeTab === 'users') {
        setActiveTab('cashier')
      }
    }
  }, [currentUser, activeTab])

  const handleLogout = async () => {
    await posApi.logout()
    setCurrentUser(null)
    setCart([])
    setActiveTab('cashier')
  }

  // Low stock count badge
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length

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

  // Inventory operations
  const handleCreateProduct = async (input: CreateProductInput) => {
    await posApi.createProduct(input)
    await loadProducts()
  }

  const handleUpdateProduct = async (id: number, input: UpdateProductInput) => {
    await posApi.updateProduct(id, input)
    await loadProducts()
  }

  const handleAdjustStock = async (id: number, delta: number) => {
    await posApi.adjustStock(id, delta)
    await loadProducts()
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

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-slate-100 text-slate-500 font-mono">
        Initializing POS terminal...
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lowStockCount={lowStockCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        onReset={handleClearCart}
        onRefreshCatalog={loadProducts}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'cashier' ? (
          <div className="grid grid-cols-12 h-full">
            {/* Left 7 cols: Product Catalog & Barcode Scanner */}
            <section className="col-span-7 h-full overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400 font-mono">
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
          </div>
        ) : activeTab === 'inventory' ? (
          <InventoryManager
            products={products}
            onRefresh={loadProducts}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onAdjustStock={handleAdjustStock}
          />
        ) : activeTab === 'history' ? (
          <OrderHistory onReprintReceipt={(receipt) => setCompletedReceipt(receipt)} />
        ) : (
          <UserManager />
        )}
      </main>

      {/* Payment Dialog Modal */}
      {isPaymentOpen && (
        <PaymentModal
          totalCents={totalCents}
          onClose={() => setIsPaymentOpen(false)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Receipt Modal (Post Checkout or Reprint) */}
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
