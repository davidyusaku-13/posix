export interface Product {
  id: number
  sku: string
  barcode: string
  name: string
  description: string
  priceCents: number
  taxRateBps: number
  stockQuantity: number
  minStockAlert: number
}

export interface CreateProductInput {
  sku: string
  barcode: string
  name: string
  description?: string
  priceCents: number
  taxRateBps?: number
  stockQuantity: number
  minStockAlert?: number
}

export interface UpdateProductInput {
  name: string
  description?: string
  priceCents: number
  taxRateBps?: number
  minStockAlert?: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  receiptNumber: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  status: string
  cashierId?: number
  cashierName?: string
  createdAt: string
}

export interface OrderItem {
  id: number
  orderId: string
  productId: number
  productName: string
  unitPriceCents: number
  quantity: number
  lineSubtotalCents: number
  taxRateBps: number
  lineTaxCents: number
}

export interface Payment {
  id: number
  orderId: string
  paymentMethod: 'cash' | 'card'
  amountTenderedCents: number
  changeCents: number
  referenceCode?: string
  createdAt: string
}

export interface CheckoutResponse {
  order: Order
  items: OrderItem[]
  payment: Payment
}

export interface OrdersRecap {
  totalOrders: number
  totalRevenueCents: number
  totalTaxCents: number
  totalCashCents: number
  totalCardCents: number
}

export type Role = 'cashier' | 'manager' | 'admin'

export interface User {
  id: number
  username: string
  name: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  username: string
  name: string
  role: Role
  pin?: string
  password?: string
}

export interface UpdateUserInput {
  name?: string
  role?: Role
  pin?: string
  password?: string
  active?: boolean
}

export interface LoginInput {
  pin?: string
  username?: string
  password?: string
}

export interface AuthResponse {
  token: string
  user: User
}
