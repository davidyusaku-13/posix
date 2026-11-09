import React, { useEffect, useState } from 'react'
import { Terminal, Clock, ShieldCheck, RefreshCw, ShoppingCart, Boxes, AlertTriangle } from 'lucide-react'

interface HeaderProps {
  activeTab: 'cashier' | 'inventory'
  onTabChange: (tab: 'cashier' | 'inventory') => void
  lowStockCount: number
  onReset: () => void
  onRefreshCatalog: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  lowStockCount,
  onReset,
  onRefreshCatalog,
}) => {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between select-none shadow-xs">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-emerald-600">
          <Terminal className="w-6 h-6 stroke-[2.5]" />
          <span className="font-extrabold text-xl tracking-wider text-slate-900">POSIX</span>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onTabChange('cashier')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'cashier'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cashier Register</span>
          </button>

          <button
            onClick={() => onTabChange('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition relative ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory</span>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold">
                <AlertTriangle className="w-2.5 h-2.5" />
                {lowStockCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="flex items-center space-x-6 text-sm text-slate-600">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs text-slate-600 font-mono font-medium">SQLite WAL Engine</span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-slate-700 font-medium">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{time}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshCatalog}
            title="Reload product catalog"
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'cashier' && (
            <button
              onClick={onReset}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 font-semibold transition shadow-2xs"
            >
              New Sale
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
