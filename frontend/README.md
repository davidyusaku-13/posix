# POSIX — Cashier Terminal Frontend

The frontend for POSIX is a keyboard- and barcode-optimized Single Page Application (SPA) built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It is designed for high-contrast cashier readability, fast barcode scanner entry, and zero external cloud dependencies.

---

## Architecture & Components

```text
frontend/src/
├── components/
│   ├── Header.tsx           # Status indicator, system clock, New Sale button
│   ├── ProductCatalog.tsx   # Barcode scanner input, product search, catalog tiles
│   ├── Cart.tsx             # Active line items, quantity modifiers, void, summary
│   ├── PaymentModal.tsx     # Cash/Card checkout dialog, quick presets, change due
│   └── ReceiptModal.tsx     # Printable thermal receipt slip with window.print()
├── services/
│   └── api.ts               # RESTful v1 API client (/api/v1/products, /api/v1/orders)
├── types/
│   └── pos.ts               # TypeScript interfaces matching backend Go domain models
├── utils/
│   └── format.ts            # Integer cents to currency formatting ($XX.XX)
├── App.tsx                  # Root state management (Cart, Products, Modal transitions)
├── main.tsx                 # React DOM mount
└── index.css                # Tailwind CSS v4 and thermal receipt styling
```

---

## Cashier Interaction Workflow

1. **Barcode Scanner Entry**: The barcode input automatically focuses upon load. Scanning a barcode or typing a SKU (e.g., `8901001`) and pressing `Enter` immediately appends the item to the active cart.
2. **Catalog Quick Tiles**: Cashiers can browse or search products by name/SKU, with visual badges indicating remaining stock and low-stock alerts.
3. **Cart & Pricing Engine**: Line subtotals, estimated sales tax, and grand totals calculate in real time.
4. **Payment Modal**:
   - **Cash**: Cashier can enter custom tendered amount or click quick cash presets (`Exact`, `$10`, `$20`, `$50`, `$100`). Change due calculates live.
   - **Card**: Ready state for debit/credit card settlement.
5. **Printable Receipt**: Upon successful checkout (`POST /api/v1/orders`), a printable receipt slip renders with the sequential receipt number (e.g. `RCP-20261108-0001`). Pressing `Next Customer` clears the cart and refreshes product inventory.

---

## Development & Build

### Development Mode (with API Proxy)
```bash
npm install
npm run dev
```
The Vite development server runs on `http://localhost:5173` and proxies all `/api/*` requests to the Go backend on `http://localhost:8080`.

### Production Build
```bash
npm run build
```
Generates production assets into `frontend/dist/`, which are embedded into the Go executable via `embed.FS`.
