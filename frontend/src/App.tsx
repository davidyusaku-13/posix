import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import { MainLayout } from './layouts/MainLayout'
import { RegisterPage } from './pages/register/RegisterPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { HistoryPage } from './pages/history/HistoryPage'
import { UsersPage } from './pages/users/UsersPage'
import { LoginPage } from './pages/login/LoginPage'
import type { Product, Role } from './types/pos'
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
  const { syncCartWithProducts } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      const data = await posApi.getProducts()
      setProducts(data)
      syncCartWithProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [syncCartWithProducts])

  useEffect(() => {
    if (currentUser) {
      loadProducts()
    }
  }, [currentUser, loadProducts])

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
        <CartProvider>
          <POSApp />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
