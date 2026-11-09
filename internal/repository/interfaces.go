package repository

import (
	"context"
	"database/sql"

	"github.com/davidyusaku-13/posix/internal/domain"
)

// ProductRepository defines persistence abstractions for products (DIP).
type ProductRepository interface {
	List(ctx context.Context, query string) ([]domain.Product, error)
	ListLowStock(ctx context.Context) ([]domain.Product, error)
	FindByID(ctx context.Context, id int64) (*domain.Product, error)
	FindByCode(ctx context.Context, code string) (*domain.Product, error)
	FindByIDTx(ctx context.Context, tx *sql.Tx, id int64) (*domain.Product, error)
	DeductStockTx(ctx context.Context, tx *sql.Tx, productID int64, qty int) error
	Create(ctx context.Context, p *domain.Product) (*domain.Product, error)
	Update(ctx context.Context, p *domain.Product) (*domain.Product, error)
	AdjustStock(ctx context.Context, id int64, delta int) (*domain.Product, error)
}

// OrderRepository defines persistence abstractions for orders, items, and payments (DIP).
type OrderRepository interface {
	CreateOrderTx(ctx context.Context, tx *sql.Tx, order *domain.Order, items []domain.OrderItem, payment *domain.Payment) error
	List(ctx context.Context, limit int) ([]domain.Order, error)
	GetByID(ctx context.Context, id string) (*domain.CheckoutResponse, error)
	GetRecap(ctx context.Context) (*domain.OrdersRecap, error)
	CountToday(ctx context.Context, datePrefix string) (int, error)
	CountTodayTx(ctx context.Context, tx *sql.Tx, datePrefix string) (int, error)
}

// UserRepository defines persistence abstractions for user accounts and RBAC credentials (DIP).
type UserRepository interface {
	List(ctx context.Context) ([]domain.User, error)
	FindByID(ctx context.Context, id int64) (*domain.User, error)
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	Create(ctx context.Context, u *domain.User) (*domain.User, error)
	Update(ctx context.Context, u *domain.User) (*domain.User, error)
	Delete(ctx context.Context, id int64) error
}

// Transactor allows executing operations inside an ACID transaction without exposing raw DB details to services.
type Transactor interface {
	WithinTransaction(ctx context.Context, fn func(tx *sql.Tx) error) error
}
