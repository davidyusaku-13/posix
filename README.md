# POSIX

POSIX is a lightweight, offline-first Point of Sale (POS) web application distributed as a single self-contained executable. It is completely cross-platform and available for all operating systems (Linux, macOS, Windows).

> **Why the name POSIX?**  
> There is no backronym or acronym meaning—it's simply called **POSIX** as a tribute to Unix/Linux by its creator. It runs everywhere.

---

## Engineering Pillars & Governance

This repository strictly adheres to five core engineering standards:

```text
       ┌────────────────────────────────────────────────────────┐
       │             WATERFALL ENGINEERING LIFECYCLE            │
       │       (Requirements → Design → Code → Verify)          │
       └──────────────────────────┬─────────────────────────────┘
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      │                           │                           │
┌─────▼──────┐              ┌─────▼──────┐              ┌─────▼──────┐
│    TDD     │              │   SOLID    │              │    DRY     │
│ Test-First │              │ Decoupled  │              │ Single Src │
│ Red→Green  │              │ Clean Arch │              │  of Truth  │
└─────┬──────┘              └─────┬──────┘              └─────┬──────┘
      │                           │                           │
      └───────────────────────────┼───────────────────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │   REST BEST PRACTICES    │
                    │ Resource Nouns, Codes    │
                    └──────────────────────────┘
```

1. **[Waterfall Methodology](docs/WATERFALL.md)**: Sequential, gate-based engineering lifecycle. Phase 1 (PRD) and Phase 2 (Architecture & Schema) are fully locked before Phase 3 (Implementation) and Phase 4 (Verification).
2. **Test-Driven Development (TDD)**: Every package (domain math, payment strategy, repository contracts, service logic, REST handlers) is authored via the Red → Green → Refactor micro-cycle.
3. **[SOLID Principles](docs/ARCHITECTURE.md#1-solid-principles-implementation)**:
   - **SRP**: Strict layering across `domain`, `payment`, `repository`, `service`, and `api`.
   - **OCP**: Strategy-pattern payment processing (`Processor` interface + `Registry`).
   - **LSP**: Fully substitutable repository and processor implementations.
   - **ISP**: Granular interfaces (`ProductRepository`, `OrderRepository`, `Transactor`).
   - **DIP**: Handlers and services depend on abstractions, wired via constructor dependency injection.
4. **DRY (Don't Repeat Yourself)**:
   - Centralized HTTP response & error handlers (`respondJSON`, `respondError`).
   - Unified row scanning (`scanProduct`) across all catalog queries.
   - Minor currency integer calculations centralized in `domain/calculator.go`.
5. **[RESTful API Best Practices](docs/ARCHITECTURE.md#3-restful-api-best-practices)**:
   - Resource-oriented URLs (`POST /api/v1/orders`, `GET /api/v1/products?code=...`).
   - Semantic HTTP status codes (`201 Created` with `Location` header, `422 Unprocessable Entity` for domain violations, `404 Not Found`).
   - Standardized structured JSON error schema.

---

## Project Structure

```text
posix/
├── cmd/server/main.go            # Entrypoint & Dependency Inversion wiring
├── docs/
│   ├── SPECIFICATION.md          # Phase 1: Requirements Analysis (PRD)
│   ├── ARCHITECTURE.md           # Phase 2: System Architecture & API Contracts
│   └── WATERFALL.md              # Software Development Lifecycle (SDLC) Guide
├── embedded.go                   # embed.FS single-binary frontend bundling
├── frontend/                     # React + Vite + Tailwind Cashier Terminal
│   ├── src/components/           # Barcode input, Cart, Payment, Receipt modal
│   └── src/services/api.ts       # REST v1 client
├── internal/
│   ├── api/                      # REST Handlers (order_handler, product_handler, router)
│   ├── database/                 # SQLite schema migrations & sample data seed
│   ├── domain/                   # Entities, integer financial math, domain errors
│   ├── payment/                  # Payment strategy pattern (Cash, Card, Registry)
│   ├── repository/               # Storage interfaces & SQLite implementations
│   └── service/                  # Business orchestration (OrderService, ProductService)
├── Makefile                      # Build, test, and run automation
└── README.md
```

---

## Quick Start

### Prerequisites
- **Go 1.22+**
- **Bun 1.1+** (only required if building frontend from source; pre-built bundle is embedded in git)

### Common Commands

```bash
# 1. Run all tests (Unit, Service, Repository, REST API)
make test

# 2. Build the single self-contained binary
make build

# 3. Run the application
make run
```

Access the POSIX terminal in your browser at:  
👉 **http://localhost:8080**

### Development Mode

Run backend and frontend independently with hot reloading:

```bash
# Terminal 1: Go Backend (runs on :8080)
make dev-be

# Terminal 2: Vite Dev Server with API proxy (runs on :5173)
make dev-fe
```

---

## REST API Overview

All API endpoints are versioned under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/products` | List all catalog products |
| `GET` | `/api/v1/products?q={query}` | Search products by name or SKU |
| `GET` | `/api/v1/products?code={barcode_or_sku}` | Instant barcode/SKU scanner lookup |
| `GET` | `/api/v1/products/{id}` | Get product details by ID |
| `POST` | `/api/v1/orders` | Create order & checkout (`201 Created` + `Location` header) |
| `GET` | `/api/v1/orders` | List recent order audit logs |
| `GET` | `/api/v1/orders/{id}` | Get order details for receipt reprinting |
| `GET` | `/api/v1/health` | Health check endpoint |

---

## License

MIT
