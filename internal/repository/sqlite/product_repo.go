package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/davidyusaku-13/posix/internal/domain"
)

type ProductRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

// scanner interface abstracts *sql.Row and *sql.Rows for DRY column mapping.
type scanner interface {
	Scan(dest ...any) error
}

// scanProduct provides a single DRY mapper for product records across all queries.
func scanProduct(s scanner) (*domain.Product, error) {
	var p domain.Product
	err := s.Scan(
		&p.ID,
		&p.SKU,
		&p.Barcode,
		&p.Name,
		&p.Description,
		&p.PriceCents,
		&p.TaxRateBps,
		&p.StockQuantity,
		&p.MinStockAlert,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

const productColumns = `id, sku, barcode, name, description, price_cents, tax_rate_bps, stock_quantity, min_stock_alert, created_at, updated_at`

func (r *ProductRepository) List(ctx context.Context, query string) ([]domain.Product, error) {
	q := strings.TrimSpace(query)
	var rows *sql.Rows
	var err error

	if q != "" {
		likeTerm := "%" + q + "%"
		stmt := fmt.Sprintf(`
			SELECT %s FROM products
			WHERE name LIKE ? OR sku LIKE ? OR barcode LIKE ?
			ORDER BY name ASC
		`, productColumns)
		rows, err = r.db.QueryContext(ctx, stmt, likeTerm, likeTerm, likeTerm)
	} else {
		stmt := fmt.Sprintf(`
			SELECT %s FROM products
			ORDER BY name ASC
		`, productColumns)
		rows, err = r.db.QueryContext(ctx, stmt)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}
	defer rows.Close()

	products := make([]domain.Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, *p)
	}
	return products, nil
}

func (r *ProductRepository) FindByID(ctx context.Context, id int64) (*domain.Product, error) {
	query := fmt.Sprintf(`SELECT %s FROM products WHERE id = ?`, productColumns)
	p, err := scanProduct(r.db.QueryRowContext(ctx, query, id))
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find product by id: %w", err)
	}
	return p, nil
}

func (r *ProductRepository) FindByCode(ctx context.Context, code string) (*domain.Product, error) {
	query := fmt.Sprintf(`SELECT %s FROM products WHERE barcode = ? OR sku = ? LIMIT 1`, productColumns)
	p, err := scanProduct(r.db.QueryRowContext(ctx, query, code, code))
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find product by code: %w", err)
	}
	return p, nil
}

func (r *ProductRepository) FindByIDTx(ctx context.Context, tx *sql.Tx, id int64) (*domain.Product, error) {
	query := fmt.Sprintf(`SELECT %s FROM products WHERE id = ?`, productColumns)
	p, err := scanProduct(tx.QueryRowContext(ctx, query, id))
	if err == sql.ErrNoRows {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find product by id in tx: %w", err)
	}
	return p, nil
}

func (r *ProductRepository) DeductStockTx(ctx context.Context, tx *sql.Tx, productID int64, qty int) error {
	res, err := tx.ExecContext(ctx, `
		UPDATE products
		SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND stock_quantity >= ?
	`, qty, productID, qty)
	if err != nil {
		return fmt.Errorf("failed to deduct stock: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return domain.ErrInsufficientInventory
	}
	return nil
}

func (r *ProductRepository) ListLowStock(ctx context.Context) ([]domain.Product, error) {
	stmt := fmt.Sprintf(`
		SELECT %s FROM products
		WHERE stock_quantity <= min_stock_alert
		ORDER BY stock_quantity ASC, name ASC
	`, productColumns)
	rows, err := r.db.QueryContext(ctx, stmt)
	if err != nil {
		return nil, fmt.Errorf("failed to list low stock products: %w", err)
	}
	defer rows.Close()

	products := make([]domain.Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, *p)
	}
	return products, nil
}

func (r *ProductRepository) Create(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO products (sku, barcode, name, description, price_cents, tax_rate_bps, stock_quantity, min_stock_alert)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, p.SKU, p.Barcode, p.Name, p.Description, p.PriceCents, p.TaxRateBps, p.StockQuantity, p.MinStockAlert)
	if err != nil {
		return nil, fmt.Errorf("failed to insert product: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *ProductRepository) Update(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET name = ?, description = ?, price_cents = ?, tax_rate_bps = ?, min_stock_alert = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, p.Name, p.Description, p.PriceCents, p.TaxRateBps, p.MinStockAlert, p.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update product: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, domain.ErrProductNotFound
	}
	return r.FindByID(ctx, p.ID)
}

func (r *ProductRepository) AdjustStock(ctx context.Context, id int64, delta int) (*domain.Product, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND (stock_quantity + ?) >= 0
	`, delta, id, delta)
	if err != nil {
		return nil, fmt.Errorf("failed to adjust stock: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		// Either product doesn't exist or delta would result in negative stock
		var exists bool
		_ = r.db.QueryRowContext(ctx, `SELECT 1 FROM products WHERE id = ?`, id).Scan(&exists)
		if !exists {
			return nil, domain.ErrProductNotFound
		}
		return nil, domain.ErrInsufficientInventory
	}
	return r.FindByID(ctx, id)
}
