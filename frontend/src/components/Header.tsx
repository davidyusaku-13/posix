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
    <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-emerald-400">
          <Terminal className="w-6 h-6 stroke-[2.5]" />
          <span className="font-bold text-xl tracking-wider text-white">POSIX</span>
        </div>
        <span className="text-xs font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Terminal Active (Local)
        </span>
      </div>

      <div className="flex items-center space-x-6 text-sm text-slate-400">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-300 font-mono">SQLite WAL Engine</span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-slate-200">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{time}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshCatalog}
            title="Reload product catalog"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onReset}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-medium transition"
          >
            New Sale
          </button>
        </div>
      </div>
    </header>
  )
}
