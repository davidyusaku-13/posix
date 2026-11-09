import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Clock, RefreshCw } from 'lucide-react'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  lowStockCount: number
  onRefreshCatalog: () => void
  onNewSale?: () => void
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  lowStockCount,
  onRefreshCatalog,
  onNewSale,
}) => {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString())
  const location = useLocation()

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/inventory':
        return 'Inventory & Stock Control'
      case '/history':
        return 'Transaction History & Settlement Recaps'
      case '/users':
        return 'Staff & User Management (RBAC)'
      case '/':
      case '/register':
      default:
        return 'Cashier Register'
    }
  }

  const isRegister = location.pathname === '/' || location.pathname === '/register'

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar lowStockCount={lowStockCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Breadcrumb / Status Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between select-none shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-extrabold text-slate-800 tracking-wide font-sans">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center space-x-5 text-sm text-slate-600">
            <div className="flex items-center space-x-1.5 font-mono text-slate-700 font-medium">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{time}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onRefreshCatalog}
                title="Reload catalog and products"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {isRegister && onNewSale && (
                <button
                  onClick={onNewSale}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 font-semibold transition shadow-2xs"
                >
                  New Sale
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
