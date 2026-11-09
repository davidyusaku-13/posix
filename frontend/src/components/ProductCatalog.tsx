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
    <div className="flex flex-col h-full bg-muted/20 border-r border-border p-4">
      {/* Barcode scanner entry */}
      <div className="mb-4">
        <form onSubmit={handleBarcodeSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary">
            <Barcode className="w-5 h-5" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan Barcode or type SKU (e.g. 8901001) & Enter"
            className="w-full pl-10 pr-24 py-2.5 bg-card border-2 border-primary rounded-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono shadow-xs font-semibold"
            autoFocus
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-none transition shadow-xs"
          >
            Scan
          </button>
        </form>

        {scanFeedback && (
          <div
            className={`mt-1.5 text-xs px-2.5 py-1 rounded-none font-mono font-medium ${
              scanFeedback.isError
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-[#fdf3e7] text-[#8f4d08] border border-[#f4d3a8]'
            }`}
          >
            {scanFeedback.message}
          </div>
        )}
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-2xs"
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
                className={`flex flex-col justify-between p-3.5 rounded-none border text-left transition relative group shadow-xs ${
                  isOutOfStock
                    ? 'bg-muted/40 border-border opacity-60 cursor-not-allowed'
                    : 'bg-card hover:bg-[#fcfaf7] border-border hover:border-primary hover:shadow-md active:scale-[0.98]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mb-1">
                    <span className="font-medium text-foreground/70">{product.sku}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Barcode className="w-3 h-3" />
                      {product.barcode}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-2 leading-snug">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                  <span className="font-extrabold text-base text-primary font-mono-nums">
                    {formatCents(product.priceCents)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isOutOfStock ? (
                      <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-none">
                        Out
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[10px] font-semibold text-[#8f4d08] bg-[#fdf3e7] border border-[#f4d3a8] px-1.5 py-0.5 rounded-none flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {product.stockQuantity} left
                      </span>
                    ) : (
                      <span className="text-[11px] text-primary font-mono flex items-center gap-1 bg-[#f5efe6] px-1.5 py-0.5 border border-[#e2d7c8]">
                        <Package className="w-3 h-3 text-primary/70" />
                        {product.stockQuantity}
                      </span>
                    )}

                    <div className="w-6 h-6 rounded-none bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-colors shadow-2xs">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Package className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium">No products found matching your search</p>
          </div>
        )}
      </div>
    </div>
  )
}
