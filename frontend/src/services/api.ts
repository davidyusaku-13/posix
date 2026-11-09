import type {
  AuthResponse,
  CheckoutResponse,
  CreateProductInput,
  CreateUserInput,
  LoginInput,
  Order,
  OrdersRecap,
  Product,
  UpdateProductInput,
  UpdateUserInput,
  User,
} from '../types/pos'

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

const TOKEN_KEY = 'posix_auth_token'

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

export const posApi = {
  // Auth Token helpers
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  },

  // Auth Endpoints
  async login(input: LoginInput): Promise<AuthResponse> {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Login failed')
    }
    const data: AuthResponse = await res.json()
    posApi.setToken(data.token)
    return data
  },

  async getMe(): Promise<User> {
    const res = await fetch('/api/v1/auth/me', {
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      posApi.clearToken()
      throw new Error('Session invalid or expired')
    }
    return res.json()
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: getAuthHeader(),
      })
    } finally {
      posApi.clearToken()
    }
  },

  // User Management
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/v1/users', {
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch users')
    }
    return res.json()
  },

  async createUser(input: CreateUserInput): Promise<User> {
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to create user')
    }
    return res.json()
  },

  async updateUser(id: number, input: UpdateUserInput): Promise<User> {
    const res = await fetch(`/api/v1/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to update user')
    }
    return res.json()
  },

  async deleteUser(id: number): Promise<void> {
    const res = await fetch(`/api/v1/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to delete user')
    }
  },

  // Products
  async getProducts(query = '', lowStock = false): Promise<Product[]> {
    let url = '/api/v1/products'
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (lowStock) params.append('low_stock', 'true')
    const qs = params.toString()
    if (qs) url += `?${qs}`

    const res = await fetch(url, { headers: getAuthHeader() })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch products')
    }
    return res.json()
  },

  async lookupByCode(code: string): Promise<Product | null> {
    const res = await fetch(`/api/v1/products?code=${encodeURIComponent(code)}`, {
      headers: getAuthHeader(),
    })
    if (res.status === 404) return null
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Product lookup failed')
    }
    return res.json()
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to create product')
    }
    return res.json()
  },

  async updateProduct(id: number, input: UpdateProductInput): Promise<Product> {
    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to update product')
    }
    return res.json()
  },

  async adjustStock(id: number, delta: number): Promise<Product> {
    const res = await fetch(`/api/v1/products/${id}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ delta }),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to adjust stock')
    }
    return res.json()
  },

  // Orders
  async getOrders(limit = 50): Promise<Order[]> {
    const res = await fetch(`/api/v1/orders?limit=${limit}`, {
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch orders')
    }
    return res.json()
  },

  async getOrderById(id: string): Promise<CheckoutResponse> {
    const res = await fetch(`/api/v1/orders/${id}`, {
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch order details')
    }
    return res.json()
  },

  async getOrdersRecap(): Promise<OrdersRecap> {
    const res = await fetch('/api/v1/orders/recap', {
      headers: getAuthHeader(),
    })
    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch orders recap')
    }
    return res.json()
  },

  async createOrder(
    items: { productId: number; quantity: number }[],
    payment: { method: 'cash' | 'card'; amountTenderedCents: number; referenceCode?: string },
    cashier?: { id: number; name: string }
  ): Promise<CheckoutResponse> {
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        items,
        payment,
        cashierId: cashier?.id,
        cashierName: cashier?.name,
      }),
    })

    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message || `Checkout failed (${res.status})`)
    }

    return res.json()
  },
}
