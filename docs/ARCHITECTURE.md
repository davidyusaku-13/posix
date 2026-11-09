# POSIX — System Architecture & Design Specification
## Phase 2: System Design, Database Schema & Architectural Principles

This document formalizes the system architecture and technical design of POSIX, strictly adhering to **SOLID**, **DRY**, **RESTful Best Practices**, and **Test-Driven Development (TDD)** within the Waterfall lifecycle.

---

### 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          POSIX Application Host                        │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   React/Vite SPA (UI)   │  │           Go HTTP Server            │  │
│  │ (Embedded via embed.FS) │◄─┼─►        (REST API & Cors)          │  │
│  └─────────────────────────┘  └───────┬─────────────────────┬───────┘  │
│                                       │                     │          │
│                            ┌──────────▼──────────┐ ┌────────▼────────┐ │
│                            │ Embedded SQLite DB  │ │ internal/       │ │
│                            │ (WAL Mode, ACID)    │ │ notification    │ │
│                            └─────────────────────┘ └────────┬────────┘ │
│                                                             │ (HTTP/   │
│                                                             │  IPC)    │
│                                                    ┌────────▼────────┐ │
│                                                    │ Baileys Bridge  │ │
│                                                    │ (Bun/Node + WA) │ │
│                                                    └─────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: React + Vite + Tailwind CSS with React Router (`react-router-dom`). Organized into modular subdirectories (`pages/`, `layouts/`, `components/`) featuring a persistent left sidebar navigation.
- **Backend**: Go standard library `net/http` router with RESTful v1 endpoints and SPA fallback.
- **Storage**: SQLite 3 with `PRAGMA journal_mode = WAL` (Write-Ahead Logging) and `PRAGMA foreign_keys = ON`.
- **Packaging**: Single executable binary embedding the frontend bundle via Go's `embed.FS`.

---

### 2. Frontend Subdirectory & Client-Side Route Architecture

POSIX uses **React Router** for real URL subpath routing, with client routes backed by Go's HTML5 SPA fallback:

| Client Path | Target Page Component | Allowed Roles | Description |
|---|---|---|---|
| `/` or `/register` | `pages/register/RegisterPage.tsx` | All (`cashier`, `manager`, `admin`) | Point of sale cashier screen (Catalog + Active cart) |
| `/inventory` | `pages/inventory/InventoryPage.tsx` | `manager`, `admin` | Real-time stock levels, quick restocking, product creation/editing |
| `/history` | `pages/history/HistoryPage.tsx` | `manager`, `admin` | Aggregate settlement recaps and individual order inspection |
| `/users` | `pages/users/UsersPage.tsx` | `admin` | Staff onboarding, role assignment, and credential resets |
| `/login` | `pages/login/LoginPage.tsx` | Public | Tactile numeric PIN pad & credentials authentication |

#### Subdirectory Organization
```text
frontend/src/
├── pages/
│   ├── register/RegisterPage.tsx     # Cashier Register (Catalog & Cart)
│   ├── inventory/InventoryPage.tsx   # Stock Management & Catalog editing
│   ├── history/HistoryPage.tsx       # Settlement Recaps & Order Ledger
│   ├── users/UsersPage.tsx           # Staff & User Management (RBAC)
│   └── login/LoginPage.tsx           # PIN & Password Authentication
├── layouts/
│   ├── MainLayout.tsx                # Persistent Sidebar + Top Bar + Page Outlet
│   └── Sidebar.tsx                   # Left navigation sidebar with role-aware links
├── components/
│   ├── cart/Cart.tsx                 # Active order cart
│   ├── catalog/ProductCatalog.tsx    # Barcode lookup & product tiles
│   ├── payment/PaymentModal.tsx      # Tendered cash & card modal
│   ├── receipt/ReceiptModal.tsx      # Printable thermal receipt
│   └── modals/
│       ├── ProductModal.tsx          # Add / Edit product dialog
│       └── OrderDetailModal.tsx      # Focused single-order audit dialog
├── context/
│   └── AuthContext.tsx               # Global authentication & role guard state
├── services/api.ts                   # RESTful API client
└── types/pos.ts                      # Domain models & inputs
```

---

### 3. Database Schema (SQLite DDL)

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
    cashier_id INTEGER REFERENCES users(id),
    cashier_name TEXT NOT NULL DEFAULT '',
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

-- 5. Users & RBAC
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

-- 6. Notification Settings & Logs
CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),     -- Singleton configuration row
    owner_phone TEXT NOT NULL DEFAULT '',      -- E.164 phone number
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    notify_low_stock INTEGER NOT NULL DEFAULT 1 CHECK (notify_low_stock IN (0, 1)),
    cooldown_minutes INTEGER NOT NULL DEFAULT 60 CHECK (cooldown_minutes >= 0),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    recipient TEXT NOT NULL,
    event_type TEXT NOT NULL,                  -- e.g. 'low_stock', 'test'
    payload TEXT NOT NULL,                     -- JSON / text message sent
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
    error_message TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
```

---

### 4. SOLID Principles Implementation

#### Single Responsibility Principle (SRP)
Every package and struct has a single reason to change:
- **`internal/domain`**: Pure business models, domain errors, and financial calculation rules (subtotal, basis-point tax, change). Contains zero database or HTTP dependencies.
- **`internal/payment`**: Strategy pattern for payment processing (`CashProcessor`, `CardProcessor`, and `Registry`).
- **`internal/repository`**: Defines persistence interfaces (`ProductRepository`, `OrderRepository`, `Transactor`) and their SQLite implementations. Contains zero HTTP or calculation logic.
- **`internal/service`**: Pure application business orchestration (`OrderService`, `ProductService`, `NotificationService`). Agnostic of HTTP and database engines.
- **`internal/notification`**: WhatsApp notification client abstraction (`Notifier` interface, `BaileysClient`, `NoopNotifier`).
- **`internal/api` (Presentation)**: Exclusively handles HTTP request decoding, invoking services, setting status codes/headers, and serializing JSON.

#### Open/Closed Principle (OCP)
- **Notification Strategy**: Store owner alerts are abstracted behind the `Notifier` interface. New notification gateways (Telegram, SMS Twilio, Discord webhook) can be registered without altering `ProductService` or `OrderService`.
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

### 5. DRY (Don't Repeat Yourself)

1. **Centralized HTTP Helpers**:
   - `respondJSON(w, statusCode, data)` and `respondError(w, statusCode, code, message)` eliminate boilerplate JSON encoding, Content-Type headers, and status code setting.
2. **Unified Product Row Mapper**:
   - Single DRY scanning function `scanProduct(scanner)` in `internal/repository/sqlite/product_repo.go` handles column mapping across all query types (list, search, code lookup, transactional lookup).
3. **Integer Financial Arithmetic**:
   - Calculations (subtotal, tax half-up rounding, change calculation) reside strictly in `domain/calculator.go` and are reused across services and tests.

---

### 6. RESTful API Best Practices

All endpoints use resource nouns (no RPC verbs), proper plural collections, and semantic HTTP status codes:

| Action | HTTP Verb | REST Resource URI | Status Code | Headers / Body |
|---|---|---|---|---|
| List all products | `GET` | `/api/v1/products` | `200 OK` | Array of product objects |
| Search products | `GET` | `/api/v1/products?q={query}` | `200 OK` | Filtered array |
| Filter low stock | `GET` | `/api/v1/products?low_stock=true` | `200 OK` | Products with stock <= min_stock_alert |
| Barcode/SKU lookup | `GET` | `/api/v1/products?code={barcode_or_sku}` | `200 OK` or `404 Not Found` | Single product |
| Get product by ID | `GET` | `/api/v1/products/{id}` | `200 OK` or `404 Not Found` | Single product |
| Create product | `POST` | `/api/v1/products` | `201 Created` | `Location: /api/v1/products/{id}`, Product object |
| Update product | `PUT` | `/api/v1/products/{id}` | `200 OK` | Updated product object |
| Adjust stock | `POST` | `/api/v1/products/{id}/stock` | `200 OK` | Product with updated stock |
| Create order (Checkout) | `POST` | `/api/v1/orders` | `201 Created` | `Location: /api/v1/orders/{id}`, Order receipt |
| Get all history recap | `GET` | `/api/v1/orders/recap` | `200 OK` | Aggregate metrics (orders, gross revenue, tax, cash, card) |
| List recent orders | `GET` | `/api/v1/orders` | `200 OK` | Array of recent orders |
| Get focused order recap | `GET` | `/api/v1/orders/{id}` | `200 OK` or `404 Not Found` | Order with line items & payment |
| User login (PIN or Password) | `POST` | `/api/v1/auth/login` | `200 OK` or `401 Unauthorized` | Auth token & user profile |
| Current user profile | `GET` | `/api/v1/auth/me` | `200 OK` or `401 Unauthorized` | User profile & role |
| List users (RBAC) | `GET` | `/api/v1/users` | `200 OK` or `403 Forbidden` | List of user accounts |
| Create user (Admin) | `POST` | `/api/v1/users` | `201 Created` or `403 Forbidden` | Created user object |
| Update user (Admin) | `PUT` | `/api/v1/users/{id}` | `200 OK` or `403 Forbidden` | Updated user object |
| Get notification settings | `GET` | `/api/v1/notifications/config` | `200 OK` or `403 Forbidden` | NotificationConfig object |
| Update notification settings | `PUT` | `/api/v1/notifications/config` | `200 OK` or `403 Forbidden` | Updated NotificationConfig |
| Get WhatsApp bridge status | `GET` | `/api/v1/notifications/status` | `200 OK` | Connection status & QR code data |
| Send test notification | `POST` | `/api/v1/notifications/test` | `200 OK` or `422 Unprocessable Entity` | Dispatch result |
| Disconnect WhatsApp session | `POST` | `/api/v1/notifications/disconnect` | `200 OK` | Disconnection confirmation |
| List notification audit logs | `GET` | `/api/v1/notifications/logs` | `200 OK` | Array of recent dispatch logs |
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

### 7. Internationalization (i18n) Architecture

#### SOLID Design Pattern
- **Single Responsibility Principle (SRP)**:
  - `frontend/src/i18n/locales/en.ts` and `id.ts`: Pure translation key-value mappings.
  - `frontend/src/i18n/formatters.ts`: Dedicated locale-aware currency and date formatting functions honoring integer minor units.
  - `frontend/src/context/I18nContext.tsx`: Manages locale state, localStorage persistence, and exports `useI18n()`.
- **Open-Closed Principle (OCP)**:
  - The dictionary interface `TranslationSchema` enforces compile-time symmetry across all supported languages. Adding a new language (e.g., Japanese, Spanish) requires creating a dictionary file satisfying `TranslationSchema` without modifying component render logic.
- **Dependency Inversion Principle (DIP)**:
  - Components depend on the `useI18n()` hook abstraction rather than hardcoded string literals or direct locale checks.

#### Currency & Number Formatting Rules
- Internally, all values remain strictly integer cents (`int64`).
- When locale is `en`: Formatted as `$X.XX` with commas for thousands and periods for decimals.
- When locale is `id`: Formatted as `Rp X.XXX` using standard Indonesian retail conventions.

---

### 8. Test-Driven Development (TDD: Red → Green → Refactor)

1. **Red**: Write unit and contract tests in `*_test.go` specifying required behavior. Verify the test fails.
2. **Green**: Write the minimal implementation code to make the test pass.
3. **Refactor**: Clean up duplication (DRY), enforce design patterns (SOLID), and verify that 100% of the test suite remains green.
