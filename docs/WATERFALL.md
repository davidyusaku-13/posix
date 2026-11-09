# POSIX — Software Development Lifecycle: Waterfall Methodology

**Project Name:** POSIX  
**Governing Methodology:** Waterfall Model  
**Core Engineering Pillars:** Waterfall • TDD • SOLID • DRY • REST Best Practices  

---

## 1. Why the Waterfall Model for POSIX?

Point of Sale (POS) and retail financial systems handle real currency, inventory transactions, and tax calculations. In financial systems, iterating haphazardly or modifying data models mid-flight causes catastrophic bugs:
- Floating-point currency rounding anomalies
- Race conditions during concurrent inventory depletion
- Corrupted transaction receipts and audit trail mismatches
- Breaking API contracts for cashier terminals

The **Waterfall Model** provides strict, phase-gated sequential discipline: **Every stage must be verified and signed off before progressing to the next.**

```text
┌────────────────────────────────────────────────────────┐
│ Phase 1: Requirements Analysis (PRD)                   │
│ └── docs/SPECIFICATION.md                              │
└──────────────────────────┬─────────────────────────────┘
                           │ [Phase Gate: Scope & Rules Signed Off]
┌──────────────────────────▼─────────────────────────────┐
│ Phase 2: System & Architectural Design                 │
│ └── docs/ARCHITECTURE.md                               │
└──────────────────────────┬─────────────────────────────┘
                           │ [Phase Gate: DB Schema & REST Contracts Locked]
┌──────────────────────────▼─────────────────────────────┐
│ Phase 3: Implementation via TDD                        │
│ └── Red → Green → Refactor (Domain, Repos, Services)  │
└──────────────────────────┬─────────────────────────────┘
                           │ [Phase Gate: Code Complete, SOLID/DRY Compliant]
┌──────────────────────────▼─────────────────────────────┐
│ Phase 4: Verification & Automated Testing              │
│ └── Unit, Integration & API Suite (100% Pass)          │
└──────────────────────────┬─────────────────────────────┘
                           │ [Phase Gate: Zero Test Failures, Validated Build]
┌──────────────────────────▼─────────────────────────────┐
│ Phase 5: Packaging, Deployment & Operations            │
│ └── Single-Binary Embedding (bin/posix)                │
└────────────────────────────────────────────────────────┘
```

---

## 2. The Five Sequential Phases

### Phase 1: Requirements Analysis & Specification
- **Primary Artifact:** `docs/SPECIFICATION.md`
- **Objectives:**
  - Define all Functional Requirements (FR-1 to FR-6: Products, Cart, Pricing, Payment, Stock, Receipts).
  - Define Non-Functional Requirements (NFR-1 to NFR-4: Minor-unit integer math, zero cloud dependencies, sub-50ms latency, single-binary distribution).
- **Exit Gate Criteria:** Requirements are unambiguous, business rules are locked, and edge cases (underpayment, negative stock, tax half-up rounding) are documented.

---

### Phase 2: System Architecture & Contract Design
- **Primary Artifact:** `docs/ARCHITECTURE.md`
- **Objectives:**
  - Design the relational database schema (`PRAGMA journal_mode = WAL`, foreign keys, indexes).
  - Define strict RESTful v1 API contracts (`POST /api/v1/orders`, `GET /api/v1/products?code=...`).
  - Establish layer boundaries following Clean/Hexagonal Architecture.
- **Exit Gate Criteria:** Database DDL and REST schemas are finalized before writing business logic.

---

### Phase 3: Implementation via TDD & Clean Architecture
- **Primary Methodology:** Test-Driven Development (TDD) + SOLID + DRY.
- **Micro-Cycle (Red → Green → Refactor):**
  1. **Red:** Author unit/contract test specifying expected behavior. Verify test fails.
  2. **Green:** Write minimal, correct code to satisfy the test.
  3. **Refactor:** Eliminate duplication (DRY), enforce single responsibility (SRP), and invert dependencies (DIP).
- **Layer Progression:**
  1. `domain`: Pure data models and integer math calculations (`calculator.go`).
  2. `payment`: Strategy pattern for payment methods (`processor.go`, `Registry`).
  3. `repository`: Interface definitions (`interfaces.go`) and SQLite implementations (`order_repo.go`, `product_repo.go`).
  4. `service`: Business orchestration (`order_service.go`, `product_service.go`).
  5. `api`: RESTful presentation handlers (`order_handler.go`, `product_handler.go`).
  6. `frontend`: React + Vite cashier terminal UI consuming REST v1 endpoints.
- **Exit Gate Criteria:** All layers compile and adhere to SOLID principles.

---

### Phase 4: Verification & Quality Assurance
- **Verification Suite:** `make test` (`go test -v -count=1 ./...`)
- **Coverage Areas:**
  - **Financial Math Accuracy:** Subtotal, tax basis points (e.g. 8.25%), half-up rounding, exact change.
  - **Inventory Integrity:** Stock decrement in ACID transactions, rejection of over-purchase.
  - **Payment Processing:** Cash change computation, card settlement, rejection of underpayment.
  - **REST Compliance:** HTTP verbs, `201 Created` with `Location` header, structured `422 Unprocessable Entity` errors.
- **Exit Gate Criteria:** 100% test pass rate with zero flaky or failing tests.

---

### Phase 5: Packaging & Operations
- **Build Target:** `make build`
- **Output:** `bin/posix` (17MB standalone executable)
- **Features:**
  - Frontend static assets embedded directly into the Go executable via `embed.FS`.
  - Self-migrating and auto-seeding embedded SQLite database.
  - Zero external runtime dependencies (works offline on any operating system: Linux, macOS, Windows).
- **Exit Gate Criteria:** Standalone binary boots, serves UI on root `/`, serves API on `/api/v1/*`, and successfully executes transactions.

---

### Phase 6: Internationalization & Localization (FR-9)
- **Requirements Analysis**: Specifications defined in `docs/SPECIFICATION.md` (FR-9.1 to FR-9.4) for dual-language English & Indonesian localization.
- **Architectural Design**: `TranslationSchema` interface contract (OCP), `I18nContext` provider (SRP/DIP), and locale-aware number/currency formatting in integer minor units.
- **TDD Verification**: Automated tests for locale switching, key lookup with interpolation, fallback handling, and Indonesian currency formatting.
- **Implementation**: Localization of all navigation, POS register, payment modals, receipt, inventory manager, orders ledger, staff manager, and notifications.
- **Exit Gate Criteria**: 100% test pass on backend & frontend; zero missing translation keys.

---

## 3. How the 5 Pillars Interlock

| Pillar | Scope | Role in POSIX |
|---|---|---|
| **Waterfall** | Macro Lifecycle | Dictates the phased progression (Requirements → Design → Code → Verify → Release). |
| **SOLID** | Structural Design | Dictates class/package boundaries, dependency injection, and strategy extensibility. |
| **DRY** | Code Quality | Eliminates duplicate schemas, row mappers, and response helpers across backend & frontend. |
| **REST Best Practices** | External Contract | Ensures consistent, resource-oriented HTTP communication (`/api/v1/orders`, `Location` headers, semantic codes). |
| **TDD** | Micro Execution | Ensures code is tested before written via the Red-Green-Refactor cycle. |
