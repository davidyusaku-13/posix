import React, { useEffect, useState } from 'react'
import { Terminal, Clock, RefreshCw, ShoppingCart, Boxes, AlertTriangle, Receipt, Users, LogOut } from 'lucide-react'
import type { Role, User } from '../types/pos'

interface HeaderProps {
  activeTab: 'cashier' | 'inventory' | 'history' | 'users'
  onTabChange: (tab: 'cashier' | 'inventory' | 'history' | 'users') => void
  lowStockCount: number
  currentUser: User
  onLogout: () => void
  onReset: () => void
  onRefreshCatalog: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  lowStockCount,
  currentUser,
  onLogout,
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

  const isManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin'
  const isAdmin = currentUser.role === 'admin'

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cashier':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between select-none shadow-xs">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-emerald-600">
          <Terminal className="w-6 h-6 stroke-[2.5]" />
          <span className="font-extrabold text-xl tracking-wider text-slate-900">POSIX</span>
        </div>

        {/* View Switcher Tabs based on RBAC */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {/* Cashier Register: Available to all roles */}
          <button
            onClick={() => onTabChange('cashier')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'cashier'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Register</span>
          </button>

          {/* Inventory: Manager and Admin only */}
          {isManagerOrAdmin && (
            <button
              onClick={() => onTabChange('inventory')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition relative ${
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
          )}

          {/* Order History: Manager and Admin only */}
          {isManagerOrAdmin && (
            <button
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>History</span>
            </button>
          )}

          {/* User Management: Admin only */}
          {isAdmin && (
            <button
              onClick={() => onTabChange('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff (RBAC)</span>
            </button>
          )}
        </nav>
      </div>

      <div className="flex items-center space-x-5 text-sm text-slate-600">
        {/* Active Staff Operator & Role Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</span>
            <span className="text-[10px] font-mono text-slate-500">@{currentUser.username}</span>
          </div>
          <span className={`ml-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getRoleBadge(currentUser.role)}`}>
            {currentUser.role}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-slate-700 font-medium">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{time}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onRefreshCatalog}
            title="Reload product catalog"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeTab === 'cashier' && (
            <button
              onClick={onReset}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-300 font-semibold transition shadow-2xs"
            >
              New Sale
            </button>
          )}

          {/* Switch User / Lock Terminal */}
          <button
            onClick={onLogout}
            title="Lock terminal / Switch cashier"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
