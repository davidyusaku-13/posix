import React, { useState, useRef } from 'react'
import { Barcode, Search, Plus, AlertTriangle, Package } from 'lucide-react'
import type { Product } from '../types/pos'
import { formatCents } from '../utils/format'

interface ProductCatalogProps {
  products: Product[]
  onAddToCart: (product: Product) => void
  onBarcodeScan: (barcodeOrSku: string) => Promise<boolean>
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart,
  onBarcodeScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [scanFeedback, setScanFeedback] = useState<{ message: string; isError: boolean } | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = scanCode.trim()
    if (!code) return

    const success = await onBarcodeScan(code)
    if (success) {
      setScanFeedback({ message: `Scanned: ${code}`, isError: false })
      setScanCode('')
    } else {
      setScanFeedback({ message: `Item not found: ${code}`, isError: true })
    }

    setTimeout(() => {
      setScanFeedback(null)
    }, 2500)
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
  )

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 p-4">
      {/* Barcode scanner entry */}
      <div className="mb-4">
        <form onSubmit={handleBarcodeSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400">
            <Barcode className="w-5 h-5" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan Barcode or type SKU (e.g. 8901001) & Enter"
            className="w-full pl-10 pr-24 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-lg text-sm text-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition"
          >
            Scan
          </button>
        </form>

        {scanFeedback && (
          <div
            className={`mt-1.5 text-xs px-2 py-1 rounded font-mono ${
              scanFeedback.isError
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {scanFeedback.message}
          </div>
        )}
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600"
        />
      </div>

      {/* Product List / Tiles */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockQuantity <= 0
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert

            return (
              <button
                key={product.id}
                disabled={isOutOfStock}
                onClick={() => onAddToCart(product)}
                className={`flex flex-col justify-between p-3 rounded-lg border text-left transition relative group ${
                  isOutOfStock
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                    : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 active:scale-[0.98]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                    <span>{product.sku}</span>
                    <span className="flex items-center gap-1">
                      <Barcode className="w-3 h-3 text-slate-500" />
                      {product.barcode}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-100 text-sm line-clamp-2 leading-tight">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="font-bold text-base text-emerald-400 font-mono-nums">
                    {formatCents(product.priceCents)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isOutOfStock ? (
                      <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Out
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {product.stockQuantity} left
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-500" />
                        {product.stockQuantity}
                      </span>
                    )}

                    <div className="w-6 h-6 rounded bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Package className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p className="text-sm">No products found matching your search</p>
          </div>
        )}
      </div>
    </div>
  )
}
