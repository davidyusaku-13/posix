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
