package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/davidyusaku-13/posix/internal/domain"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) CreateOrderTx(ctx context.Context, tx *sql.Tx, order *domain.Order, items []domain.OrderItem, payment *domain.Payment) error {
	// 1. Insert Order
	_, err := tx.ExecContext(ctx, `
		INSERT INTO orders (id, receipt_number, subtotal_cents, tax_cents, total_cents, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, order.ID, order.ReceiptNumber, order.SubtotalCents, order.TaxCents, order.TotalCents, order.Status, order.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert order: %w", err)
	}

	// 2. Insert Order Items
	stmtItem, err := tx.PrepareContext(ctx, `
		INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, line_subtotal_cents, tax_rate_bps, line_tax_cents)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare order items stmt: %w", err)
	}
	defer stmtItem.Close()

	for i := range items {
		res, err := stmtItem.ExecContext(ctx, order.ID, items[i].ProductID, items[i].ProductName, items[i].UnitPriceCents, items[i].Quantity, items[i].LineSubtotalCents, items[i].TaxRateBps, items[i].LineTaxCents)
		if err != nil {
			return fmt.Errorf("failed to insert order item: %w", err)
		}
		items[i].ID, _ = res.LastInsertId()
	}

	// 3. Insert Payment
	payRes, err := tx.ExecContext(ctx, `
		INSERT INTO payments (order_id, payment_method, amount_tendered_cents, change_cents, reference_code, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, order.ID, payment.PaymentMethod, payment.AmountTenderedCents, payment.ChangeCents, payment.ReferenceCode, payment.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert payment: %w", err)
	}
	payment.ID, _ = payRes.LastInsertId()

	return nil
}

func (r *OrderRepository) List(ctx context.Context, limit int) ([]domain.Order, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, receipt_number, subtotal_cents, tax_cents, total_cents, status, created_at
		FROM orders
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list orders: %w", err)
	}
	defer rows.Close()

	orders := make([]domain.Order, 0)
	for rows.Next() {
		var o domain.Order
		if err := rows.Scan(&o.ID, &o.ReceiptNumber, &o.SubtotalCents, &o.TaxCents, &o.TotalCents, &o.Status, &o.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan order: %w", err)
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id string) (*domain.CheckoutResponse, error) {
	var order domain.Order
	err := r.db.QueryRowContext(ctx, `
		SELECT id, receipt_number, subtotal_cents, tax_cents, total_cents, status, created_at
		FROM orders
		WHERE id = ?
	`, id).Scan(&order.ID, &order.ReceiptNumber, &order.SubtotalCents, &order.TaxCents, &order.TotalCents, &order.Status, &order.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound // Not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	// Line items
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, order_id, product_id, product_name, unit_price_cents, quantity, line_subtotal_cents, tax_rate_bps, line_tax_cents
		FROM order_items
		WHERE order_id = ?
		ORDER BY id ASC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query order items: %w", err)
	}
	defer rows.Close()

	items := make([]domain.OrderItem, 0)
	for rows.Next() {
		var it domain.OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.ProductName, &it.UnitPriceCents, &it.Quantity, &it.LineSubtotalCents, &it.TaxRateBps, &it.LineTaxCents); err != nil {
			return nil, fmt.Errorf("failed to scan item: %w", err)
		}
		items = append(items, it)
	}

	// Payment
	var payment domain.Payment
	err = r.db.QueryRowContext(ctx, `
		SELECT id, order_id, payment_method, amount_tendered_cents, change_cents, reference_code, created_at
		FROM payments
		WHERE order_id = ?
		ORDER BY id DESC LIMIT 1
	`, id).Scan(&payment.ID, &payment.OrderID, &payment.PaymentMethod, &payment.AmountTenderedCents, &payment.ChangeCents, &payment.ReferenceCode, &payment.CreatedAt)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get payment: %w", err)
	}

	return &domain.CheckoutResponse{
		Order:   order,
		Items:   items,
		Payment: payment,
	}, nil
}

func (r *OrderRepository) CountToday(ctx context.Context, datePrefix string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM orders WHERE receipt_number LIKE ?
	`, "RCP-"+datePrefix+"%").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count orders: %w", err)
	}
	return count, nil
}

func (r *OrderRepository) GetRecap(ctx context.Context) (*domain.OrdersRecap, error) {
	recap := &domain.OrdersRecap{}

	// 1. Total completed orders, gross revenue, tax
	err := r.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(*), 
			COALESCE(SUM(total_cents), 0), 
			COALESCE(SUM(tax_cents), 0)
		FROM orders
		WHERE status = 'completed'
	`).Scan(&recap.TotalOrders, &recap.TotalRevenueCents, &recap.TotalTaxCents)
	if err != nil {
		return nil, fmt.Errorf("failed to query orders recap: %w", err)
	}

	// 2. Cash vs Card settled breakdown
	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			p.payment_method, 
			COALESCE(SUM(p.amount_tendered_cents - p.change_cents), 0)
		FROM payments p
		JOIN orders o ON p.order_id = o.id
		WHERE o.status = 'completed'
		GROUP BY p.payment_method
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments recap: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var method string
		var amount int64
		if err := rows.Scan(&method, &amount); err != nil {
			return nil, err
		}
		if method == "cash" {
			recap.TotalCashCents = amount
		} else if method == "card" {
			recap.TotalCardCents = amount
		}
	}

	return recap, nil
}

func (r *OrderRepository) CountTodayTx(ctx context.Context, tx *sql.Tx, datePrefix string) (int, error) {
	var count int
	err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM orders WHERE receipt_number LIKE ?
	`, "RCP-"+datePrefix+"%").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count orders in tx: %w", err)
	}
	return count, nil
}
