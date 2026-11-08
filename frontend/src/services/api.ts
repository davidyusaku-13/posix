import type { CheckoutResponse, Product } from '../types/pos'

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export const posApi = {
  // Fetch all products or filter by query
  async getProducts(query = ''): Promise<Product[]> {
    const url = query ? `/api/v1/products?q=${encodeURIComponent(query)}` : '/api/v1/products'
    const res = await fetch(url)
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch products')
    }
    return res.json()
  },

  // Lookup single product by barcode or SKU
  async lookupByCode(code: string): Promise<Product | null> {
    const res = await fetch(`/api/v1/products?code=${encodeURIComponent(code)}`)
    if (res.status === 404) {
      return null
    }
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Product lookup failed')
    }
    return res.json()
  },

  // Create Order (Checkout)
  async createOrder(
    items: { productId: number; quantity: number }[],
    payment: { method: 'cash' | 'card'; amountTenderedCents: number; referenceCode?: string }
  ): Promise<CheckoutResponse> {
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, payment }),
    })

    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || `Checkout failed (${res.status})`)
    }

    return res.json()
  },
}
