import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, Product } from '../types/pos'
import { computeTaxCents } from '../utils/format'

const CART_STORAGE_KEY = 'posix_active_cart'

interface CartContextType {
  cart: CartItem[]
  totalItemsCount: number
  subtotalCents: number
  taxCents: number
  totalCents: number
  addToCart: (product: Product) => void
  updateQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clearCart: () => void
  syncCartWithProducts: (products: Product[]) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial cart state from localStorage to survive page refresh
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (err) {
      console.warn('Failed to load active cart from localStorage:', err)
    }
    return []
  })

  // Automatically synchronize any cart changes into localStorage
  useEffect(() => {
    try {
      if (cart.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY)
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
      }
    } catch (err) {
      console.warn('Failed to persist cart to localStorage:', err)
    }
  }, [cart])

  const addToCart = useCallback((product: Product) => {
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
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId))
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
  }, [])

  const removeItem = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  // Keep restored cart items in sync with latest product prices and stock limits
  const syncCartWithProducts = useCallback((products: Product[]) => {
    if (products.length === 0) return
    const productMap = new Map(products.map((p) => [p.id, p]))

    setCart((prev) => {
      let changed = false
      const updated: CartItem[] = []

      for (const item of prev) {
        const currentProd = productMap.get(item.product.id)
        if (!currentProd || currentProd.stockQuantity <= 0) {
          // Product no longer exists or completely out of stock
          changed = true
          continue
        }

        const validQty = Math.min(item.quantity, currentProd.stockQuantity)
        if (
          validQty !== item.quantity ||
          item.product.priceCents !== currentProd.priceCents ||
          item.product.taxRateBps !== currentProd.taxRateBps ||
          item.product.name !== currentProd.name ||
          item.product.stockQuantity !== currentProd.stockQuantity
        ) {
          changed = true
          updated.push({
            product: currentProd,
            quantity: validQty,
          })
        } else {
          updated.push(item)
        }
      }

      return changed ? updated : prev
    })
  }, [])

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
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

  return (
    <CartContext.Provider
      value={{
        cart,
        totalItemsCount,
        subtotalCents,
        taxCents,
        totalCents,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        syncCartWithProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = (): CartContextType => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
