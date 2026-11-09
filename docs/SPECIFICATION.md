# POSIX — Requirements Specification (PRD)
## Phase 1: Requirements Specification (PRD)

**Project Name:** POSIX  
**Domain:** Retail & General Store Point of Sale  
**Architecture:** Cross-Platform, Offline-First Single Binary Web Application  
**Methodology:** Waterfall (Requirements → Design → Implementation → Verification → Release)

---

### 1. Vision & Objectives
POSIX is a lightweight, reliable, cross-platform Point of Sale web application. It runs on any operating system (Linux, macOS, Windows) and browser. It guarantees transaction safety, zero floating-point calculation errors, rapid barcode/keyboard-driven cashier operations, and zero external cloud dependencies.

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

#### 2.5 Inventory Control & Management (FR-5)
- **FR-5.1**: Stock is atomically reduced upon successful checkout.
- **FR-5.2**: Transactions will be rejected if requested quantity exceeds available stock (configurable allow-backorder flag if needed; defaults to strict stock checks).
- **FR-5.3 (Product Creation)**: Managers can register new catalog items with unique SKU, unique barcode, name, description, unit price (cents), tax rate (basis points), initial stock, and low-stock threshold.
- **FR-5.4 (Product Editing)**: Managers can modify existing product details (name, description, price, tax rate, minimum stock alert).
- **FR-5.5 (Stock Adjustment & Restocking)**: Managers can restock items (+quantity) or perform manual stock reconciliations/recounts.
- **FR-5.6 (Low Stock Alerting)**: Terminal highlights low-stock items and allows filtering by products at or below their alert threshold.

#### 2.6 Receipt & Audit History (FR-6)
- **FR-6.1**: Every completed order generates a formatted receipt with timestamp, cashier, line items, taxes, payment method, amount tendered, and change.
- **FR-6.2**: Historical order lookup: Cashiers can review past sales of the day and reprint receipts.
- **FR-6.3 (All History Recap / Settlement)**: System provides an aggregate financial summary across all transactions: total completed orders, gross revenue, total tax collected, and payment breakdown (Cash Total vs. Card Total).
- **FR-6.4 (Focused Single Order Recap)**: Cashiers can select any individual transaction to inspect the complete itemized breakdown (SKUs, quantities, line totals, taxes, tendered, change) with one-click receipt reprinting.

#### 2.7 User Authentication & Role-Based Access Control (FR-7)
- **FR-7.1 (Role-Based RBAC)**: Three hierarchical roles govern terminal access:
  - `cashier`: Checkout register, barcode scanning, cart management, and printing receipts.
  - `manager`: Cashier privileges + Inventory control (restock, add/edit products) + Order History & Settlements.
  - `admin`: All manager privileges + User Management (create staff, reset credentials, assign roles).
- **FR-7.2 (Authentication via PIN & Password)**:
  - Quick 4-6 digit numeric PIN for rapid cashier logins and shift handovers.
  - Username & Password for administrative logins.
  - All credentials hashed strictly with `bcrypt`.
- **FR-7.3 (User Management)**: Admins can create staff accounts, update roles, toggle active status, and reset credentials.
- **FR-7.4 (Order Attribution)**: Completed orders record the `cashier_id` and `cashier_name` of the active terminal operator.

#### 2.8 WhatsApp Store Owner Notifications via Baileys (FR-8)
- **FR-8.1 (Store Owner Notification Channel)**: The POS system integrates with a local WhatsApp service powered by Baileys (`@whiskeysockets/baileys`) to send automated direct alerts to the store owner's mobile phone number without requiring paid cloud SMS or third-party WhatsApp Business API gateways.
- **FR-8.2 (Low Stock Threshold Alerts)**: Whenever an inventory item's quantity drops to or below its defined low-stock alert threshold (`stock_quantity <= min_stock_alert`), an automated WhatsApp alert is dispatched to the store owner.
  - **Trigger Points**:
    1. Cashier completes a sale that depletes stock to or below threshold.
    2. Manager/Admin manual downward stock recount reduces stock to or below threshold.
  - **Notification Payload**: Structured, actionable text including store name, product title, SKU/barcode, remaining quantity, alert threshold, and timestamp.
  - **Deduplication & Anti-Flood**: The notification engine suppresses duplicate alerts for the same product unless stock was restocked above threshold and depleted again, or a configurable cool-off window has elapsed.
- **FR-8.3 (Device Pairing & Session Management)**: Store owner/admin pairs their WhatsApp device via multi-device QR code in the POS administrative interface. Signal session keys and credentials are stored securely in a local directory (`data/whatsapp_auth/`).
- **FR-8.4 (Configuration & Diagnostics)**:
  - Configurable owner phone number (E.164 format, e.g., `+1234567890` or `6281234567890`).
  - Notification toggles: Master enable/disable, Low-Stock alerts enable/disable.
  - On-demand "Send Test Notification" to verify phone number and socket pairing.
- **FR-8.5 (Non-Blocking Fault Isolation)**: All WhatsApp dispatch operations are strictly asynchronous (via goroutines and background queues). If the WhatsApp socket is disconnected, pairing is pending, or local bridge is unreachable, POS cashier checkout and inventory transactions proceed with 100% reliability and zero user-facing latency.

---

### 3. Non-Functional Requirements

- **NFR-1 (Reliability & Offline-First)**: Must operate 100% locally with zero internet dependency via embedded SQLite.
- **NFR-2 (Financial Accuracy)**: No rounding anomalies; exact integer cents throughout.
- **NFR-3 (Performance)**: Barcode scan-to-cart latency $< 50\text{ms}$.
- **NFR-4 (Portability & Simplicity)**: The entire application (Go backend + embedded React SPA) compiles into a single executable binary across operating systems (Linux, macOS, Windows).

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
