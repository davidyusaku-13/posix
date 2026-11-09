package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

const SchemaSQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
    cashier_id INTEGER REFERENCES users(id),
    cashier_name TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_receipt ON orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_subtotal_cents INTEGER NOT NULL CHECK (line_subtotal_cents >= 0),
    tax_rate_bps INTEGER NOT NULL DEFAULT 0,
    line_tax_cents INTEGER NOT NULL CHECK (line_tax_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
    amount_tendered_cents INTEGER NOT NULL CHECK (amount_tendered_cents >= 0),
    change_cents INTEGER NOT NULL DEFAULT 0 CHECK (change_cents >= 0),
    reference_code TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cashier', 'manager', 'admin')),
    pin_hash TEXT DEFAULT '',
    password_hash TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`

// InitDB opens a SQLite database, configures pragmas, runs migrations and seeds default data.
func InitDB(dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if dsn == ":memory:" || strings.Contains(dsn, "mode=memory") {
		db.SetMaxOpenConns(1)
	}

	// Configure SQLite pragmas for durability and concurrent reads
	if _, err := db.Exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`); err != nil {
		return nil, fmt.Errorf("failed to set pragmas: %w", err)
	}

	// Apply Schema
	if _, err := db.Exec(SchemaSQL); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Schema evolution / migrations for existing databases
	_, _ = db.Exec(`ALTER TABLE orders ADD COLUMN cashier_id INTEGER REFERENCES users(id);`)
	_, _ = db.Exec(`ALTER TABLE orders ADD COLUMN cashier_name TEXT NOT NULL DEFAULT '';`)
	_, _ = db.Exec(`DELETE FROM orders WHERE cashier_name = '' OR cashier_name IS NULL OR cashier_id IS NULL;`)

	// Seed sample retail data if empty
	if err := SeedSampleProducts(db); err != nil {
		log.Printf("warning: failed to seed products: %v", err)
	}

	// Seed default users if empty
	if err := SeedDefaultUsers(db); err != nil {
		log.Printf("warning: failed to seed users: %v", err)
	}

	return db, nil
}

// SeedSampleProducts populates sample catalog items if products table is empty.
func SeedSampleProducts(db *sql.DB) error {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM products`).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // already seeded
	}

	sampleProducts := []struct {
		sku         string
		barcode     string
		name        string
		description string
		priceCents  int64
		taxRateBps  int
		stock       int
	}{
		{"BEV-001", "8901001", "Espresso Whole Bean 250g", "Artisanal roasted blend", 1250, 825, 45},
		{"BEV-002", "8901002", "Cold Brew Bottle 330ml", "Single-origin organic cold brew", 450, 825, 60},
		{"SNK-001", "8902001", "Almond Biscotti (2pk)", "Crispy twice-baked almond cookie", 295, 825, 30},
		{"SNK-002", "8902002", "Sea Salt Dark Chocolate Bar", "72% cacao fair-trade chocolate", 350, 825, 80},
		{"STA-001", "8903001", "Grid Notebook A5", "Hardcover 160 pages dot-grid", 800, 825, 25},
		{"STA-002", "8903002", "Gel Pen 0.5mm Black", "Smooth archival waterproof ink", 220, 825, 150},
		{"MER-001", "8904001", "POSIX Canvas Tote Bag", "Durable heavy canvas bag", 1500, 825, 18},
		{"MER-002", "8904002", "POSIX Stainless Tumbler 16oz", "Double-wall vacuum insulated", 2200, 825, 12},
	}

	stmt, err := db.Prepare(`
		INSERT INTO products (sku, barcode, name, description, price_cents, tax_rate_bps, stock_quantity)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, p := range sampleProducts {
		if _, err := stmt.Exec(p.sku, p.barcode, p.name, p.description, p.priceCents, p.taxRateBps, p.stock); err != nil {
			return err
		}
	}

	log.Printf("Successfully seeded %d sample retail products", len(sampleProducts))
	return nil
}

// SeedDefaultUsers creates initial admin, manager, and cashier staff accounts if users table is empty.
func SeedDefaultUsers(db *sql.DB) error {
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	// Default passwords & PINs
	adminPass, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	adminPin, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)

	mgrPass, _ := bcrypt.GenerateFromPassword([]byte("manager123"), bcrypt.DefaultCost)
	mgrPin, _ := bcrypt.GenerateFromPassword([]byte("5678"), bcrypt.DefaultCost)

	cashierPin, _ := bcrypt.GenerateFromPassword([]byte("0000"), bcrypt.DefaultCost)

	defaultUsers := []struct {
		username string
		name     string
		role     string
		pin      string
		pass     string
	}{
		{"admin", "System Administrator", "admin", string(adminPin), string(adminPass)},
		{"manager", "Store Shift Manager", "manager", string(mgrPin), string(mgrPass)},
		{"cashier", "Front Desk Cashier", "cashier", string(cashierPin), ""},
	}

	stmt, err := db.Prepare(`
		INSERT INTO users (username, name, role, pin_hash, password_hash, active)
		VALUES (?, ?, ?, ?, ?, 1)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, u := range defaultUsers {
		if _, err := stmt.Exec(u.username, u.name, u.role, u.pin, u.pass); err != nil {
			return err
		}
	}

	log.Printf("Successfully seeded %d default RBAC staff accounts", len(defaultUsers))
	return nil
}
