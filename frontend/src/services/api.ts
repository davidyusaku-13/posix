import type { CheckoutResponse, CreateProductInput, Order, OrdersRecap, Product, UpdateProductInput } from '../types/pos'

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export const posApi = {
  // Fetch all products or filter by search query
  async getProducts(query = '', lowStock = false): Promise<Product[]> {
    let url = '/api/v1/products'
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (lowStock) params.append('low_stock', 'true')
    const qs = params.toString()
    if (qs) url += `?${qs}`

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

  // Create new product
  async createProduct(input: CreateProductInput): Promise<Product> {
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to create product')
    }
    return res.json()
  },

  // Update existing product metadata
  async updateProduct(id: number, input: UpdateProductInput): Promise<Product> {
    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to update product')
    }
    return res.json()
  },

  // Adjust product inventory stock (+/- delta)
  async adjustStock(id: number, delta: number): Promise<Product> {
    const res = await fetch(`/api/v1/products/${id}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to adjust stock')
    }
    return res.json()
  },

  // List recent orders
  async getOrders(limit = 50): Promise<Order[]> {
    const res = await fetch(`/api/v1/orders?limit=${limit}`)
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch orders')
    }
    return res.json()
  },

  // Get single order with line items and payment (focused recap)
  async getOrderById(id: string): Promise<CheckoutResponse> {
    const res = await fetch(`/api/v1/orders/${id}`)
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch order details')
    }
    return res.json()
  },

  // Get aggregate recap across all order history
  async getOrdersRecap(): Promise<OrdersRecap> {
    const res = await fetch('/api/v1/orders/recap')
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch orders recap')
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
