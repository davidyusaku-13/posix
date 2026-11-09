import React from 'react'
import { NavLink } from 'react-router-dom'
import { Terminal, ShoppingCart, Boxes, Receipt, Users, LogOut, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import type { Role } from '../types/pos'

interface SidebarProps {
  lowStockCount: number
}

export const Sidebar: React.FC<SidebarProps> = ({ lowStockCount }) => {
  const { currentUser, logout, hasRole } = useAuth()
  const { totalItemsCount } = useCart()

  if (!currentUser) return null

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

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-none font-bold text-xs transition duration-150 relative ${
      isActive
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen select-none shrink-0 shadow-xs">
      {/* Brand & Terminal Header */}
      <div>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-emerald-600">
            <div className="w-9 h-9 rounded-none bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
              <Terminal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-xl tracking-wider text-slate-900 block leading-tight">POSIX</span>
              <span className="text-[10px] font-mono font-medium text-slate-400">Point of Sale System</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-1 rounded-none">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse" />
              Terminal #1 Active
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {/* Register (All roles) */}
          <NavLink to="/" end className={navItemClass}>
            <ShoppingCart className="w-4 h-4" />
            <span className="flex-1">Cashier Register</span>
            {totalItemsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {totalItemsCount}
              </span>
            )}
          </NavLink>

          {/* Inventory (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/inventory" className={navItemClass}>
              <Boxes className="w-4 h-4" />
              <span className="flex-1">Inventory Control</span>
              {lowStockCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-none text-[10px] bg-amber-500 text-white font-mono font-bold">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          )}

          {/* History (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/history" className={navItemClass}>
              <Receipt className="w-4 h-4" />
              <span>Order History & Recaps</span>
            </NavLink>
          )}

          {/* Staff (Admin only) */}
          {hasRole(['admin']) && (
            <NavLink to="/users" className={navItemClass}>
              <Users className="w-4 h-4" />
              <span>Staff Management (RBAC)</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Operator Footer Profile & Lock Button */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2.5 rounded-none shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-none bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {currentUser.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-none border ${getRoleBadge(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Lock terminal / Switch cashier"
            className="p-1.5 rounded-none text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
