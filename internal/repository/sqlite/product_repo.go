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
