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
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col justify-between h-screen select-none shrink-0 shadow-xs">
      {/* Brand & Terminal Header */}
      <div>
        <div className="p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="w-9 h-9 rounded-none bg-[#f5efe6] border border-[#e2d7c8] text-primary flex items-center justify-center shadow-2xs">
              <Terminal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-xl tracking-wider text-foreground block leading-tight">POSIX</span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground">Point of Sale System</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#8f4d08] bg-[#fdf3e7] border border-[#f4d3a8] px-2.5 py-1 rounded-none">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-none bg-[#c26d17] animate-pulse" />
              Terminal #1 Active
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#8f4d08]" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {/* Register (All roles) */}
          <NavLink to="/" end className={navItemClass}>
            <ShoppingCart className="w-4 h-4" />
            <span className="flex-1">Register</span>
            {totalItemsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-[#f5efe6] text-primary border border-[#e2d7c8]">
                {totalItemsCount}
              </span>
            )}
          </NavLink>

          {/* Inventory (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/inventory" className={navItemClass}>
              <Boxes className="w-4 h-4" />
              <span className="flex-1">Inventory</span>
              {lowStockCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-none text-[10px] bg-[#c26d17] text-white font-mono font-bold">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          )}

          {/* Orders (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/history" className={navItemClass}>
              <Receipt className="w-4 h-4" />
              <span className="flex-1">Orders</span>
            </NavLink>
          )}

          {/* Staff (Admin only) */}
          {hasRole(['admin']) && (
            <NavLink to="/users" className={navItemClass}>
              <Users className="w-4 h-4" />
              <span className="flex-1">Staff</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Operator Footer Profile & Lock Button */}
      <div className="p-4 border-t border-border bg-muted/40">
        <div className="flex items-center justify-between gap-2 bg-card border border-border p-2.5 rounded-none shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-none bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate leading-tight">
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
            className="p-1.5 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
