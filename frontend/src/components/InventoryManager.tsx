import React, { useState } from 'react'
import { Plus, Search, AlertTriangle, Edit3, ArrowUpDown, Box, RefreshCw } from 'lucide-react'
import type { CreateProductInput, Product, UpdateProductInput } from '../types/pos'
import { formatCents } from '../utils/format'
import { ProductModal } from './ProductModal'

interface InventoryManagerProps {
  products: Product[]
  onRefresh: () => void
  onCreateProduct: (input: CreateProductInput) => Promise<void>
  onUpdateProduct: (id: number, input: UpdateProductInput) => Promise<void>
  onAdjustStock: (id: number, delta: number) => Promise<void>
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  onRefresh,
  onCreateProduct,
  onUpdateProduct,
  onAdjustStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [restockProductId, setRestockProductId] = useState<number | null>(null)
  const [customDeltaStr, setCustomDeltaStr] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    const matchesLowStock = showLowStockOnly ? p.stockQuantity <= p.minStockAlert : true
    return matchesSearch && matchesLowStock
  })

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length

  const handleQuickRestock = async (productId: number, delta: number) => {
    try {
      setIsAdjusting(true)
      setErrorBanner(null)
      await onAdjustStock(productId, delta)
      setRestockProductId(null)
      setCustomDeltaStr('')
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to adjust stock')
    } finally {
      setIsAdjusting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-hidden">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-emerald-600" />
            Inventory & Stock Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time inventory counts, restock products, and manage catalog pricing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 transition shadow-2xs"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {errorBanner && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-none text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-none border border-slate-200 shadow-xs mb-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-none text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Low Stock Filter Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-1.5 rounded-none text-xs font-bold flex items-center gap-1.5 transition border ${
              showLowStockOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-none shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Min Alert</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0
                const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900">{p.sku}</div>
                      <div className="text-[10px] text-slate-400">{p.barcode}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.description && <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.description}</div>}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCents(p.priceCents)}
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          0 (Out)
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          {p.stockQuantity}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {p.stockQuantity}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {p.minStockAlert}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Quick Restock toggle */}
                        <div className="relative">
                          <button
                            onClick={() => setRestockProductId(restockProductId === p.id ? null : p.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-bold text-xs transition flex items-center gap-1 shadow-2xs"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            <span>Stock</span>
                          </button>

                          {restockProductId === p.id && (
                            <div className="absolute right-0 top-8 z-30 bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-56 space-y-2 text-left animate-in fade-in zoom-in-95 duration-100">
                              <p className="font-bold text-slate-800 text-xs">Adjust Stock: {p.name}</p>
                              <div className="grid grid-cols-3 gap-1">
                                {[10, 25, 50].map((delta) => (
                                  <button
                                    key={delta}
                                    disabled={isAdjusting}
                                    onClick={() => handleQuickRestock(p.id, delta)}
                                    className="py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded font-mono font-bold text-xs transition border border-slate-200"
                                  >
                                    +{delta}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-1 pt-1 border-t border-slate-100">
                                <input
                                  type="number"
                                  placeholder="+/- qty"
                                  value={customDeltaStr}
                                  onChange={(e) => setCustomDeltaStr(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                />
                                <button
                                  disabled={!customDeltaStr || isAdjusting}
                                  onClick={() => handleQuickRestock(p.id, parseInt(customDeltaStr, 10) || 0)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs disabled:opacity-50"
                                >
                                  Go
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Edit metadata */}
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-transparent hover:border-slate-300 transition"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Box className="w-10 h-10 mb-2 stroke-[1.2]" />
              <p className="text-sm font-semibold text-slate-500">No products match your criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {isCreateOpen && (
        <ProductModal
          onClose={() => setIsCreateOpen(false)}
          onSaveCreate={onCreateProduct}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaveUpdate={onUpdateProduct}
        />
      )}
    </div>
  )
}
