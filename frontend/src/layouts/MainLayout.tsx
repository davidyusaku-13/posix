import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Clock, RefreshCw, PanelLeft, MessageSquare } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { WhatsAppModal } from '../components/WhatsAppModal'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'

interface MainLayoutProps {
  lowStockCount: number
  onRefreshCatalog: () => void
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  lowStockCount,
  onRefreshCatalog,
}) => {
  const { hasRole } = useAuth()
  const { dict } = useI18n()
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString())
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('posix_sidebar_collapsed') === 'true'
  })
  const location = useLocation()

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('posix_sidebar_collapsed', String(next))
      return next
    })
  }

  // Keyboard shortcut: Ctrl+B or Cmd+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/inventory':
        return dict.nav.inventory
      case '/history':
        return dict.nav.orders
      case '/users':
        return dict.nav.staff
      case '/':
      case '/register':
      default:
        return dict.nav.register
    }
  }

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        lowStockCount={lowStockCount}
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Breadcrumb / Status Bar */}
        <header className="bg-card border-b border-border px-6 py-2.5 flex items-center justify-between select-none shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Expand sidebar (Ctrl+B)"
                className="p-1.5 -ml-1.5 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-sm font-extrabold text-foreground tracking-wide font-sans">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center space-x-5 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1.5 font-mono text-foreground font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{time}</span>
            </div>

            <div className="flex items-center space-x-2">
              <LanguageSwitcher />

              {hasRole(['manager', 'admin']) && (
                <button
                  type="button"
                  onClick={() => setIsWhatsAppOpen(true)}
                  title="WhatsApp Low Stock Notifications"
                  className="px-2.5 py-1 text-xs font-semibold bg-[#fdf3e7] text-[#8f4d08] hover:bg-[#fae7ce] border border-[#f4d3a8] rounded-none flex items-center gap-1.5 transition shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              <button
                onClick={onRefreshCatalog}
                title="Reload catalog and products"
                className="p-1.5 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />
    </div>
  )
}
