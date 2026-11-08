# POSIX — System Architecture & Design Specification (Refactored)
## Architectural Principles: SOLID, DRY, RESTful & TDD

This document details the refactored architecture of POSIX strictly conforming to:
1. **SOLID Principles**
2. **DRY (Don't Repeat Yourself)**
3. **RESTful API Best Practices**
4. **Test-Driven Development (TDD) Methodology**

---

### 1. SOLID Principles Implementation

#### Single Responsibility Principle (SRP)
Each package and struct has one distinct reason to change:
- **`domain`**: Defines business models, domain events, financial calculation rules, and domain errors. No database or HTTP dependencies.
- **`repository`**: Defines data persistence interfaces (`ProductRepository`, `OrderRepository`). Contains zero HTTP or payment calculation logic.
- **`service`**: Pure application business orchestration (`OrderService`, `ProductService`). Agnostic of whether the caller is an HTTP handler, CLI tool, or background job.
- **`payment`**: Payment strategy implementations (`CashProcessor`, `CardProcessor`).
- **`handler` (Presentation)**: Exclusively handles HTTP serialization, deserialization, status codes, and invoking services.

#### Open/Closed Principle (OCP)
- **Payment Processing Strategy**: Payment processing is abstracted behind a `PaymentProcessor` interface:
  ```go
  type PaymentProcessor interface {
      Process(ctx context.Context, totalCents, tenderedCents int64, ref string) (*domain.Payment, error)
  }
  ```
  New payment methods (e.g. Gift Card, QRIS / Pix, Crypto) can be registered into a `PaymentRegistry` without altering existing order/checkout logic.

#### Liskov Substitution Principle (LSP)
- Repository interfaces (`ProductRepository`, `OrderRepository`) can be swapped seamlessly between `sqlite.Repository`, in-memory test fakes, or PostgreSQL implementations without breaking any service behavior.

#### Interface Segregation Principle (ISP)
- Interfaces are granular:
  - `ProductReader`: `GetByID(ctx, id)`, `FindByCode(ctx, code)`, `Search(ctx, query)`
  - `ProductStockManager`: `DeductStock(ctx, tx, productID, qty)`
  - `OrderWriter`: `Save(ctx, tx, order, items, payment)`

#### Dependency Inversion Principle (DIP)
- High-level modules (`OrderService`, `ProductHandler`) do not depend on low-level modules (`sql.DB`, SQLite drivers). Both depend on abstractions (`ProductRepository`, `OrderRepository`, `OrderService`). Dependencies are injected via constructors.

---

### 2. DRY (Don't Repeat Yourself)

1. **Centralized HTTP Helpers**:
   - `respondJSON(w, statusCode, data)` and `respondError(w, statusCode, code, message)` eliminate duplicated boilerplate JSON serialization and header setting.
2. **Unified Product Row Mapper**:
   - Single mapping function `scanProduct(scanner)` used across all queries (list, search, lookup).
3. **Financial Math**:
   - Calculations (subtotal, basis-point tax half-up rounding, change calculation) reside exclusively in `domain/calculator.go`.

---

### 3. RESTful API Best Practices

| Action | HTTP Method | REST Resource URI | Status Code | Headers / Body |
|---|---|---|---|---|
| List products | `GET` | `/api/v1/products` | `200 OK` | Array of products |
| Search products | `GET` | `/api/v1/products?q={query}` | `200 OK` | Filtered products |
| Lookup by barcode/SKU | `GET` | `/api/v1/products?code={barcode_or_sku}` | `200 OK` or `404 Not Found` | Single product |
| Get product by ID | `GET` | `/api/v1/products/{id}` | `200 OK` or `404 Not Found` | Product object |
| Create order (Checkout) | `POST` | `/api/v1/orders` | `201 Created` | `Location: /api/v1/orders/{id}`, Order receipt |
| List recent orders | `GET` | `/api/v1/orders` | `200 OK` | Array of orders |
| Get order by ID | `GET` | `/api/v1/orders/{id}` | `200 OK` or `404 Not Found` | Order with line items & payment |

#### Standardized Error Schema
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock",
    "details": {
      "productId": 1,
      "available": 5,
      "requested": 10
    }
  }
}
```

---

### 4. TDD Methodology (Red -> Green -> Refactor)
1. **Red**: Write unit and contract tests describing the expected behavior before writing the implementation.
2. **Green**: Write the minimal code to satisfy the tests.
3. **Refactor**: Clean up duplication, enforce design patterns, verify all tests remain green.
