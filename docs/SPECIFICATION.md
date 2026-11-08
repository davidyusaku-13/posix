# POSIX — Point of Sale Interactive eXperience
## Phase 1: Requirements Specification (PRD)

**Project Name:** POSIX  
**Domain:** Retail & General Store Point of Sale  
**Architecture:** Local / Standalone, Offline-First Single Binary  
**Methodology:** Waterfall (Requirements → Design → Implementation → Verification → Release)

---

### 1. Vision & Objectives
POSIX is a lightweight, reliable, Linux-native Point of Sale system built for local standalone terminals. It guarantees transaction safety, zero floating-point calculation errors, rapid barcode/keyboard-driven cashier operations, and zero external cloud dependencies.

---

### 2. Functional Requirements

#### 2.1 Product & Catalog Management (FR-1)
- **FR-1.1**: Each product must have a unique identifier (`id`), a unique SKU/barcode, name, description, unit price (in integer cents), tax rate, and active inventory count.
- **FR-1.2**: Support fast lookup by exact barcode scan or partial text search (SKU / Name).
- **FR-1.3**: Ability to set low-stock thresholds to alert cashiers when stock is running out.

#### 2.2 Cashier Cart & Order Flow (FR-2)
- **FR-2.1**: **Barcode / Keyboard-first interaction**: Cashier can scan a barcode directly or type to search and press Enter to append to the active cart.
- **FR-2.2**: Quick quantity adjustment (`+`, `-`, or direct input).
- **FR-2.3**: Ability to remove an item or clear/void the entire active cart.
- **FR-2.4**: Line-item subtotal recalculations happen instantaneously upon any cart change.

#### 2.3 Pricing & Tax Engine (FR-3)
- **FR-3.1**: **Minor-Unit Currency Representation**: All monetary values are represented strictly as integers (cents / minor units). Floating-point math is strictly forbidden in database and calculation layers.
- **FR-3.2**: Configurable tax calculation (e.g., standard sales tax rate, e.g., 8.25% or 10%).
- **FR-3.3**: Order summary must clearly display:
  - Subtotal (sum of line items)
  - Tax Total
  - Grand Total (`Subtotal + Tax`)

#### 2.4 Checkout & Payment Processing (FR-4)
- **FR-4.1**: Supported payment methods:
  - **Cash**: Cashier enters amount tendered; system computes change due. Cash tendered must be $\ge$ Grand Total.
  - **Card / External**: Recorded with optional reference/approval code.
- **FR-4.2**: **Atomic Checkout**: Completing a sale must execute in a single ACID transaction:
  1. Verify all items in cart have sufficient stock.
  2. Deduct inventory quantities.
  3. Create an immutable `Order` record and associated `OrderItems`.
  4. Record the `Payment` transaction.
  5. Generate a unique sequential Receipt Number (e.g., `RCP-YYYYMMDD-XXXX`).

#### 2.5 Inventory Control (FR-5)
- **FR-5.1**: Stock is atomically reduced upon successful checkout.
- **FR-5.2**: Transactions will be rejected if requested quantity exceeds available stock (configurable allow-backorder flag if needed; defaults to strict stock checks).

#### 2.6 Receipt & Audit History (FR-6)
- **FR-6.1**: Every completed order generates a formatted receipt with timestamp, cashier, line items, taxes, payment method, amount tendered, and change.
- **FR-6.2**: Historical order lookup: Cashiers can review past sales of the day and reprint receipts.

---

### 3. Non-Functional Requirements

- **NFR-1 (Reliability & Offline-First)**: Must operate 100% locally with zero internet dependency via embedded SQLite.
- **NFR-2 (Financial Accuracy)**: No rounding anomalies; exact integer cents throughout.
- **NFR-3 (Performance)**: Barcode scan-to-cart latency $< 50\text{ms}$.
- **NFR-4 (Portability & Simplicity)**: The entire application (Go backend + embedded React SPA) compiles into a single executable binary on Linux.

---

### 4. User Journey (Cashier Workflow)
```text
[ Start Order ] 
      │
      ▼
[ Scan Barcode / Search Item ] ──► [ Item Added to Cart ]
      │                                    │
      ▼                                    ▼
[ Adjust Quantities / Review Totals ] ◄────┘
      │
      ▼
[ Press Checkout / Pay ]
      │
      ├─► Cash Tendered ──► Compute Change
      └─► Card / Digital ──► Record Payment
      │
      ▼
[ Atomic Transaction: Deduct Stock + Save Order ]
      │
      ▼
[ Print/Display Receipt ] ──► [ Ready for Next Customer ]
```
