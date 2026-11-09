import React, { useEffect, useState } from 'react'
import { Terminal, Clock, ShieldCheck, RefreshCw } from 'lucide-react'

interface HeaderProps {
  onReset: () => void
  onRefreshCatalog: () => void
}

export const Header: React.FC<HeaderProps> = ({ onReset, onRefreshCatalog }) => {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between select-none shadow-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-emerald-600">
          <Terminal className="w-6 h-6 stroke-[2.5]" />
          <span className="font-extrabold text-xl tracking-wider text-slate-900">POSIX</span>
        </div>
        <span className="text-xs font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Terminal Active (Local)
        </span>
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
          <button
            onClick={onReset}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 font-semibold transition shadow-2xs"
          >
            New Sale
          </button>
        </div>
      </div>
    </header>
  )
}
