import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'info'

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  confirmIcon?: React.ReactNode
  isLoading?: boolean
  errorMsg?: string | null
  children?: React.ReactNode
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmIcon,
  isLoading = false,
  errorMsg = null,
  children,
  onConfirm,
  onCancel,
}) => {
  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 text-white',
          Icon: CheckCircle2,
        }
      case 'warning':
        return {
          iconContainer: 'bg-amber-50 text-amber-600 border-amber-200/80',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 text-white',
          Icon: AlertTriangle,
        }
      case 'info':
        return {
          iconContainer: 'bg-blue-50 text-blue-600 border-blue-200/80',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 text-white',
          Icon: Info,
        }
      case 'danger':
      default:
        return {
          iconContainer: 'bg-rose-50 text-rose-600 border-rose-200/80',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 text-white',
          Icon: AlertTriangle,
        }
    }
  }

  const { iconContainer, confirmBtn, Icon: VariantIcon } = getVariantStyles()

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none"
      onClick={() => {
        if (!isLoading) onCancel()
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-none p-6 shadow-2xl border border-slate-200 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-none text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning/Status Icon */}
        <div className={`w-12 h-12 mx-auto mb-4 rounded-none border flex items-center justify-center shadow-2xs ${iconContainer}`}>
          <VariantIcon className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Modal Title */}
        <h3 className="text-lg font-black text-slate-900 tracking-wide">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <div className="text-xs text-slate-500 mt-2 leading-relaxed">
            {description}
          </div>
        )}

        {/* Optional Custom Injected Details (e.g. staff card) */}
        {children}

        {/* Error alert inside modal if operation failed */}
        {errorMsg && (
          <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded-none text-rose-700 text-xs flex items-center gap-1.5 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-none border border-slate-200 transition active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-none shadow-md disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-1.5 ${confirmBtn}`}
          >
            {confirmIcon}
            <span>{isLoading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
