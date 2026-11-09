package domain

import "time"

// Product represents an inventory item available for sale.
type Product struct {
	ID            int64     `json:"id"`
	SKU           string    `json:"sku"`
	Barcode       string    `json:"barcode"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	PriceCents    int64     `json:"priceCents"`    // Stored in minor currency units (e.g., cents)
	TaxRateBps    int       `json:"taxRateBps"`    // Basis points: 825 = 8.25%, 1000 = 10%
	StockQuantity int       `json:"stockQuantity"` // Current available physical stock
	MinStockAlert int       `json:"minStockAlert"` // Alert threshold
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Order represents a completed retail transaction.
type Order struct {
	ID            string    `json:"id"`
	ReceiptNumber string    `json:"receiptNumber"`
	SubtotalCents int64     `json:"subtotalCents"`
	TaxCents      int64     `json:"taxCents"`
	TotalCents    int64     `json:"totalCents"`
	Status        string    `json:"status"` // 'completed', 'voided'
	CreatedAt     time.Time `json:"createdAt"`
}

// OrderItem represents an individual line item on an order.
type OrderItem struct {
	ID                int64  `json:"id"`
	OrderID           string `json:"orderId"`
	ProductID         int64  `json:"productId"`
	ProductName       string `json:"productName"`
	UnitPriceCents    int64  `json:"unitPriceCents"`
	Quantity          int    `json:"quantity"`
	LineSubtotalCents int64  `json:"lineSubtotalCents"`
	TaxRateBps        int    `json:"taxRateBps"`
	LineTaxCents      int64  `json:"lineTaxCents"`
}

type PaymentMethod string

const (
	PaymentMethodCash PaymentMethod = "cash"
	PaymentMethodCard PaymentMethod = "card"
)

// Payment records the financial settlement of an order.
type Payment struct {
	ID                  int64         `json:"id"`
	OrderID             string        `json:"orderId"`
	PaymentMethod       PaymentMethod `json:"paymentMethod"`
	AmountTenderedCents int64         `json:"amountTenderedCents"`
	ChangeCents         int64         `json:"changeCents"`
	ReferenceCode       string        `json:"referenceCode"`
	CreatedAt           time.Time     `json:"createdAt"`
}

// CheckoutItemInput represents a line item submitted for checkout.
type CheckoutItemInput struct {
	ProductID int64 `json:"productId"`
	Quantity  int   `json:"quantity"`
}

// PaymentInput represents the payment info submitted for checkout.
type PaymentInput struct {
	Method              string `json:"method"` // 'cash', 'card'
	AmountTenderedCents int64  `json:"amountTenderedCents"`
	ReferenceCode       string `json:"referenceCode,omitempty"`
}

// CheckoutRequest is the full payload sent by the cashier terminal.
type CheckoutRequest struct {
	Items   []CheckoutItemInput `json:"items"`
	Payment PaymentInput        `json:"payment"`
}

// CheckoutResponse contains the finalized order, line items, and payment receipt.
type CheckoutResponse struct {
	Order   Order       `json:"order"`
	Items   []OrderItem `json:"items"`
	Payment Payment     `json:"payment"`
}

// CreateProductInput represents the payload to register a new product.
type CreateProductInput struct {
	SKU           string `json:"sku"`
	Barcode       string `json:"barcode"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	PriceCents    int64  `json:"priceCents"`
	TaxRateBps    int    `json:"taxRateBps"`
	StockQuantity int    `json:"stockQuantity"`
	MinStockAlert int    `json:"minStockAlert"`
}

// UpdateProductInput represents metadata updates for an existing product.
type UpdateProductInput struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	PriceCents    int64  `json:"priceCents"`
	TaxRateBps    int    `json:"taxRateBps"`
	MinStockAlert int    `json:"minStockAlert"`
}

// AdjustStockInput represents stock increment or decrement delta.
type AdjustStockInput struct {
	Delta int `json:"delta"`
}

// OrdersRecap represents the aggregate settlement summary across all orders.
type OrdersRecap struct {
	TotalOrders       int64 `json:"totalOrders"`
	TotalRevenueCents int64 `json:"totalRevenueCents"`
	TotalTaxCents     int64 `json:"totalTaxCents"`
	TotalCashCents    int64 `json:"totalCashCents"`
	TotalCardCents    int64 `json:"totalCardCents"`
}
