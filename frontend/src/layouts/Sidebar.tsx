import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Terminal,
  ShoppingCart,
  Boxes,
  Receipt,
  Users,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import type { Role } from '../types/pos'

interface SidebarProps {
  lowStockCount: number
  isCollapsed: boolean
  onToggle: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  lowStockCount,
  isCollapsed,
  onToggle,
}) => {
  const { currentUser, logout, hasRole } = useAuth()
  const { totalItemsCount } = useCart()

  if (!currentUser) return null

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'manager':
        return 'bg-[#fdf3e7] text-[#8f4d08] border-[#f4d3a8]'
      case 'cashier':
      default:
        return 'bg-[#f5efe6] text-primary border-[#e2d7c8]'
    }
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    isCollapsed
      ? `flex items-center justify-center w-10 h-10 mx-auto rounded-none font-bold text-xs transition duration-150 relative group ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`
      : `flex items-center gap-3 px-3.5 py-2.5 rounded-none font-bold text-xs transition duration-150 relative ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-sidebar border-r border-border flex flex-col justify-between h-screen select-none shrink-0 shadow-xs transition-all duration-200 ease-in-out`}
    >
      {/* Brand & Terminal Header */}
      <div>
        {isCollapsed ? (
          <div className="p-3 border-b border-border/60 flex flex-col items-center">
            <button
              type="button"
              onClick={onToggle}
              title="Expand sidebar (Ctrl+B)"
              className="w-10 h-10 rounded-none bg-[#f5efe6] hover:bg-[#eee5d8] border border-[#e2d7c8] text-primary flex items-center justify-center transition shadow-2xs group relative"
            >
              <Terminal className="w-5 h-5 stroke-[2.5] group-hover:hidden" />
              <PanelLeftOpen className="w-5 h-5 stroke-[2.5] hidden group-hover:block" />
            </button>
            <div
              className="mt-2.5 w-8 py-1 flex items-center justify-center bg-[#fdf3e7] border border-[#f4d3a8] rounded-none"
              title="Terminal #1 Active (Secured)"
            >
              <span className="w-2 h-2 rounded-none bg-[#c26d17] animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-primary min-w-0">
                <div className="w-8 h-8 rounded-none bg-[#f5efe6] border border-[#e2d7c8] text-primary flex items-center justify-center shadow-2xs shrink-0">
                  <Terminal className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-lg tracking-wider text-foreground block leading-tight">
                    POSIX
                  </span>
                  <span className="text-[9px] font-mono font-medium text-muted-foreground truncate block">
                    Point of Sale
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggle}
                title="Collapse sidebar (Ctrl+B)"
                className="p-1.5 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#8f4d08] bg-[#fdf3e7] border border-[#f4d3a8] px-2.5 py-1 rounded-none">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-none bg-[#c26d17] animate-pulse" />
                Terminal #1 Active
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#8f4d08]" />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`p-2 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Register (All roles) */}
          <NavLink to="/" end className={navItemClass}>
            <ShoppingCart className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="flex-1">Register</span>}
            {totalItemsCount > 0 &&
              (isCollapsed ? (
                <span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 flex items-center justify-center text-[9px] font-mono font-bold bg-[#c26d17] text-white rounded-none shadow-xs">
                  {totalItemsCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-[#f5efe6] text-primary border border-[#e2d7c8]">
                  {totalItemsCount}
                </span>
              ))}
            {isCollapsed && (
              <div className="hidden group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-bold rounded-none whitespace-nowrap z-50 pointer-events-none shadow-md items-center">
                Register
              </div>
            )}
          </NavLink>

          {/* Inventory (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/inventory" className={navItemClass}>
              <Boxes className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="flex-1">Inventory</span>}
              {lowStockCount > 0 &&
                (isCollapsed ? (
                  <span
                    title={`${lowStockCount} items low stock`}
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-mono font-bold bg-[#c26d17] text-white rounded-none shadow-xs"
                  >
                    !
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-none text-[10px] bg-[#c26d17] text-white font-mono font-bold">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {lowStockCount}
                  </span>
                ))}
              {isCollapsed && (
                <div className="hidden group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-bold rounded-none whitespace-nowrap z-50 pointer-events-none shadow-md items-center">
                  Inventory
                </div>
              )}
            </NavLink>
          )}

          {/* Orders (Manager & Admin) */}
          {hasRole(['manager', 'admin']) && (
            <NavLink to="/history" className={navItemClass}>
              <Receipt className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="flex-1">Orders</span>}
              {isCollapsed && (
                <div className="hidden group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-bold rounded-none whitespace-nowrap z-50 pointer-events-none shadow-md items-center">
                  Orders
                </div>
              )}
            </NavLink>
          )}

          {/* Staff (Admin only) */}
          {hasRole(['admin']) && (
            <NavLink to="/users" className={navItemClass}>
              <Users className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="flex-1">Staff</span>}
              {isCollapsed && (
                <div className="hidden group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-bold rounded-none whitespace-nowrap z-50 pointer-events-none shadow-md items-center">
                  Staff
                </div>
              )}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Operator Footer Profile & Lock Button */}
      {isCollapsed ? (
        <div className="p-3 border-t border-border bg-muted/40 flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-none bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-2xs group relative cursor-default"
            title={`${currentUser.name} (${currentUser.role})`}
          >
            {currentUser.name.charAt(0).toUpperCase()}
            <div className="hidden group-hover:flex absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-bold rounded-none whitespace-nowrap z-50 pointer-events-none shadow-md flex-col">
              <span>{currentUser.name}</span>
              <span className="text-[10px] opacity-75 font-mono uppercase">{currentUser.role}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Lock terminal / Switch cashier"
            className="mt-2.5 w-10 h-8 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition flex items-center justify-center shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
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
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-none border ${getRoleBadge(
                      currentUser.role
                    )}`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Lock terminal / Switch cashier"
              className="p-1.5 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
