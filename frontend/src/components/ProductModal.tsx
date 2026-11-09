import React, { useState, useEffect } from 'react'
import { X, Check, PackagePlus, AlertCircle } from 'lucide-react'
import type { CreateProductInput, Product, UpdateProductInput } from '../types/pos'
import { useI18n } from '../context/I18nContext'

interface ProductModalProps {
  product?: Product | null // If null/undefined, we are creating; if present, we are editing
  onClose: () => void
  onSaveCreate?: (input: CreateProductInput) => Promise<void>
  onSaveUpdate?: (id: number, input: UpdateProductInput) => Promise<void>
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onSaveCreate,
  onSaveUpdate,
}) => {
  const { dict, currency } = useI18n()
  const isEditing = !!product

  const [name, setName] = useState(product?.name || '')
  const [sku, setSku] = useState(product?.sku || '')
  const [barcode, setBarcode] = useState(product?.barcode || '')
  const [description, setDescription] = useState(product?.description || '')
  const [priceStr, setPriceStr] = useState(product ? (product.priceCents / 100).toFixed(2) : '')
  const [stockStr, setStockStr] = useState(product ? product.stockQuantity.toString() : '10')
  const [minAlertStr, setMinAlertStr] = useState(product ? product.minStockAlert.toString() : '5')
  const [taxRatePctStr, setTaxRatePctStr] = useState(product ? (product.taxRateBps / 100).toFixed(2) : '8.25')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isSubmitting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = name.trim()
    const trimmedSku = sku.trim()
    const trimmedBarcode = barcode.trim()
    const priceCents = Math.round((parseFloat(priceStr) || 0) * 100)
    const stockQty = parseInt(stockStr, 10) || 0
    const minAlert = parseInt(minAlertStr, 10) || 5
    const taxRateBps = Math.round((parseFloat(taxRatePctStr) || 0) * 100)

    if (!trimmedName) {
      setErrorMsg('Product name is required')
      return
    }

    if (!isEditing && (!trimmedSku || !trimmedBarcode)) {
      setErrorMsg('SKU and Barcode are required')
      return
    }

    if (priceCents < 0) {
      setErrorMsg('Price cannot be negative')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && onSaveUpdate) {
        await onSaveUpdate(product.id, {
          name: trimmedName,
          description: description.trim(),
          priceCents,
          taxRateBps,
          minStockAlert: minAlert,
        })
      } else if (onSaveCreate) {
        await onSaveCreate({
          name: trimmedName,
          sku: trimmedSku,
          barcode: trimmedBarcode,
          description: description.trim(),
          priceCents,
          taxRateBps,
          stockQuantity: stockQty,
          minStockAlert: minAlert,
        })
      }
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product')
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 w-full max-w-lg rounded-none shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? `${dict.inventory.editProduct}: ${product.name}` : dict.inventory.addProduct}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {dict.inventory.colName} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Colombian Roast Beans 500g"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {dict.inventory.colSku} *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BEV-003"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-slate-100 disabled:text-slate-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {dict.inventory.colBarcode} *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 8901003"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-slate-100 disabled:text-slate-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {dict.inventory.colPrice} ({currency === 'IDR' ? 'Rp' : '$'}) *
              </label>
              <input
                type="number"
                step={currency === 'IDR' ? '1000' : '0.01'}
                min="0"
                required
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder={currency === 'IDR' ? '15000' : '0.00'}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {dict.inventory.taxRateLabel}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxRatePctStr}
                onChange={(e) => setTaxRatePctStr(e.target.value)}
                placeholder="8.25"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {dict.inventory.colStock}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockStr}
                  onChange={(e) => setStockStr(e.target.value)}
                  placeholder="10"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {dict.inventory.colAlert}
                </label>
                <input
                  type="number"
                  min="1"
                  value={minAlertStr}
                  onChange={(e) => setMinAlertStr(e.target.value)}
                  placeholder="5"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
                />
              </div>
            </div>
          )}

          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={minAlertStr}
                onChange={(e) => setMinAlertStr(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief item description..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
            />
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-none text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-none text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              {dict.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm rounded-none shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? dict.common.loading : isEditing ? dict.common.save : dict.inventory.addProduct}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
