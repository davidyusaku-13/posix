import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { RegisterPage } from './pages/register/RegisterPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { HistoryPage } from './pages/history/HistoryPage'
import { UsersPage } from './pages/users/UsersPage'
import { LoginPage } from './pages/login/LoginPage'
import type { CartItem, Product, Role } from './types/pos'
import { posApi } from './services/api'

// Role-Guarded Route component
const ProtectedRoute: React.FC<{
  children: React.ReactNode
  allowedRoles?: Role[]
}> = ({ children, allowedRoles }) => {
  const { currentUser, isLoadingAuth, hasRole } = useAuth()

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-slate-100 text-slate-500 font-mono">
        Initializing terminal session...
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function POSApp() {
  const { currentUser } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      const data = await posApi.getProducts()
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadProducts()
    }
  }, [currentUser, loadProducts])

  // Cart actions
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

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in MainLayout with Sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout
              lowStockCount={lowStockCount}
              onRefreshCatalog={loadProducts}
              onNewSale={handleClearCart}
            />
          </ProtectedRoute>
        }
      >
        {/* Register Route (/) or (/register) */}
        <Route
          index
          element={
            <RegisterPage
              products={products}
              isLoading={isLoadingProducts}
              onRefreshProducts={loadProducts}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onBarcodeScan={handleBarcodeScan}
            />
          }
        />
        <Route
          path="register"
          element={
            <RegisterPage
              products={products}
              isLoading={isLoadingProducts}
              onRefreshProducts={loadProducts}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onBarcodeScan={handleBarcodeScan}
            />
          }
        />

        {/* Inventory Route (/inventory) */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <InventoryPage
                products={products}
                onRefreshProducts={loadProducts}
              />
            </ProtectedRoute>
          }
        />

        {/* Order History Route (/history) */}
        <Route
          path="history"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Users Route (/users) */}
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <POSApp />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
