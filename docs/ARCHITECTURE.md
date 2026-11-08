# POSIX — System Architecture & Design Specification
## Phase 2: System Design, Database Schema & Architectural Principles

This document formalizes the system architecture and technical design of POSIX, strictly adhering to **SOLID**, **DRY**, **RESTful Best Practices**, and **Test-Driven Development (TDD)** within the Waterfall lifecycle.

---

### 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   POSIX Single Binary                  │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │   React/Vite SPA (UI)   │  │   Go HTTP Server    │  │
│  │ (Embedded via embed.FS) │◄─┼─► (REST API & Cors) │  │
│  └─────────────────────────┘  └──────────┬──────────┘  │
│                                          │             │
│                               ┌──────────▼──────────┐  │
│                               │ Embedded SQLite DB  │  │
│                               │ (WAL Mode, ACID)    │  │
│                               └─────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Frontend**: React + Vite + Tailwind CSS. Optimized for rapid keyboard & touchscreen cashier input.
- **Backend**: Go standard library `net/http` router with RESTful v1 endpoints.
- **Storage**: SQLite 3 with `PRAGMA journal_mode = WAL` (Write-Ahead Logging) and `PRAGMA foreign_keys = ON`.
- **Packaging**: Single executable binary embedding the frontend bundle via Go's `embed.FS`.

---

### 2. Database Schema (SQLite DDL)

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Products & Inventory Catalog
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps >= 0), -- Basis points (e.g. 825 = 8.25%)
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 2. Orders (Header)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,                       -- UUID v4
    receipt_number TEXT NOT NULL UNIQUE,      -- Format: RCP-YYYYMMDD-XXXX
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_receipt ON orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 3. Order Items (Lines)
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

-- 4. Payments
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
```

---

### 3. SOLID Principles Implementation

#### Single Responsibility Principle (SRP)
Every package and struct has a single reason to change:
- **`internal/domain`**: Pure business models, domain errors, and financial calculation rules (subtotal, basis-point tax, change). Contains zero database or HTTP dependencies.
- **`internal/payment`**: Strategy pattern for payment processing (`CashProcessor`, `CardProcessor`, and `Registry`).
- **`internal/repository`**: Defines persistence interfaces (`ProductRepository`, `OrderRepository`, `Transactor`) and their SQLite implementations. Contains zero HTTP or calculation logic.
- **`internal/service`**: Pure application business orchestration (`OrderService`, `ProductService`). Agnostic of HTTP and database engines.
- **`internal/api` (Presentation)**: Exclusively handles HTTP request decoding, invoking services, setting status codes/headers, and serializing JSON.

#### Open/Closed Principle (OCP)
- **Payment Processing Strategy**: Payment processing is abstracted behind a `payment.Processor` interface:
  ```go
  type Processor interface {
      Process(ctx context.Context, totalCents, tenderedCents int64, ref string) (*ProcessResult, error)
  }
  ```
  New payment methods (e.g., GiftCard, QRIS, StoreCredit) can be registered into `payment.Registry` without altering `OrderService` or database code.

#### Liskov Substitution Principle (LSP)
- Repository interfaces (`ProductRepository`, `OrderRepository`) and processor strategies are completely substitutable. Services operate against interfaces, allowing in-memory test fakes, SQLite, or PostgreSQL implementations to be used interchangeably.

#### Interface Segregation Principle (ISP)
- Interfaces are narrowly scoped to their consumers:
  - `ProductRepository`: Catalog listing, barcode lookup, and atomic stock deduction inside transactions.
  - `OrderRepository`: Order, line item, and payment record creation and querying.
  - `Transactor`: Encapsulates transaction lifecycle without leaking SQL connection semantics.

#### Dependency Inversion Principle (DIP)
- High-level modules (`OrderService`, `ProductHandler`) do not depend on low-level concrete modules (`sql.DB`, drivers). Both depend on abstractions (`ProductRepository`, `OrderRepository`, `ProductService`, `OrderService`). All dependencies are injected via constructors in `cmd/server/main.go`.

---

### 4. DRY (Don't Repeat Yourself)

1. **Centralized HTTP Helpers**:
   - `respondJSON(w, statusCode, data)` and `respondError(w, statusCode, code, message)` eliminate boilerplate JSON encoding, Content-Type headers, and status code setting.
2. **Unified Product Row Mapper**:
   - Single DRY scanning function `scanProduct(scanner)` in `internal/repository/sqlite/product_repo.go` handles column mapping across all query types (list, search, code lookup, transactional lookup).
3. **Integer Financial Arithmetic**:
   - Calculations (subtotal, tax half-up rounding, change calculation) reside strictly in `domain/calculator.go` and are reused across services and tests.

---

### 5. RESTful API Best Practices

All endpoints use resource nouns (no RPC verbs), proper plural collections, and semantic HTTP status codes:

| Action | HTTP Verb | REST Resource URI | Status Code | Headers / Body |
|---|---|---|---|---|
| List all products | `GET` | `/api/v1/products` | `200 OK` | Array of product objects |
| Search products | `GET` | `/api/v1/products?q={query}` | `200 OK` | Filtered array |
| Barcode/SKU lookup | `GET` | `/api/v1/products?code={barcode_or_sku}` | `200 OK` or `404 Not Found` | Single product |
| Get product by ID | `GET` | `/api/v1/products/{id}` | `200 OK` or `404 Not Found` | Single product |
| Create order (Checkout) | `POST` | `/api/v1/orders` | `201 Created` | `Location: /api/v1/orders/{id}`, Order receipt |
| List recent orders | `GET` | `/api/v1/orders` | `200 OK` | Array of recent orders |
| Get order by ID | `GET` | `/api/v1/orders/{id}` | `200 OK` or `404 Not Found` | Order with line items & payment |
| Health check | `GET` | `/api/v1/health` | `200 OK` | `{"status":"healthy","system":"POSIX"}` |

#### Standardized Error Schema
```json
{
  "error": {
    "code": "INSUFFICIENT_PAYMENT",
    "message": "payment amount tendered is less than total amount due: tendered 100 cents, required 1353 cents",
    "details": null
  }
}
```

---

### 6. Test-Driven Development (TDD: Red → Green → Refactor)

1. **Red**: Write unit and contract tests in `*_test.go` specifying required behavior. Verify the test fails.
2. **Green**: Write the minimal implementation code to make the test pass.
3. **Refactor**: Clean up duplication (DRY), enforce design patterns (SOLID), and verify that 100% of the test suite remains green.
