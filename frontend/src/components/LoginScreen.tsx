import React, { useState } from 'react'
import { Terminal, Lock, User, Delete, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import type { User as UserType } from '../types/pos'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { LanguageSwitcher } from './common/LanguageSwitcher'

interface LoginScreenProps {
  onLoginSuccess?: (user: UserType) => void
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { loginWithPin, loginWithCredentials } = useAuth()
  const { dict } = useI18n()
  const [pin, setPin] = useState('')
  const [usePasswordMode, setUsePasswordMode] = useState(false)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleNumpad = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit
      setPin(nextPin)
      setErrorMsg(null)
      if (nextPin.length === 4) {
        // Auto-attempt login on 4 digits
        submitPin(nextPin)
      }
    }
  }

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1))
    setErrorMsg(null)
  }

  const handleClear = () => {
    setPin('')
    setErrorMsg(null)
  }

  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const user = await loginWithPin(pinToSubmit)
      onLoginSuccess?.(user)
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid PIN')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const user = await loginWithCredentials(username, password)
      onLoginSuccess?.(user)
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = (presetPin: string) => {
    setPin(presetPin)
    submitPin(presetPin)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-background p-4 select-none font-sans">
      <div className="w-full max-w-sm bg-card border border-border rounded-none shadow-xl overflow-hidden p-6 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher showCurrency={false} />
        </div>

        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-none bg-[#f5efe6] text-primary border border-[#e2d7c8] mb-3 shadow-2xs">
            <Terminal className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-wider">{dict.auth.welcome}</h1>
          <p className="text-xs text-muted-foreground mt-1">{dict.auth.signInPrompt}</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-secondary p-1 rounded-none mb-6 border border-border">
          <button
            type="button"
            onClick={() => {
              setUsePasswordMode(false)
              setErrorMsg(null)
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-none transition ${
              !usePasswordMode ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {dict.auth.usePin}
          </button>
          <button
            type="button"
            onClick={() => {
              setUsePasswordMode(true)
              setErrorMsg(null)
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-none transition ${
              usePasswordMode ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {dict.auth.usePassword}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-none text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {!usePasswordMode ? (
          /* Numpad PIN Login */
          <div>
            {/* PIN Dots indicator */}
            <div className="flex items-center justify-center gap-3 py-4 mb-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-none transition-all duration-150 ${
                    idx < pin.length
                      ? 'bg-primary scale-110 shadow-xs'
                      : 'bg-muted border border-border'
                  }`}
                />
              ))}
            </div>

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpad(digit)}
                  className="h-14 rounded-none bg-secondary hover:bg-muted border border-border text-foreground font-extrabold text-xl shadow-2xs active:scale-95 transition"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-none bg-secondary hover:bg-muted border border-border text-muted-foreground font-bold text-xs active:scale-95 transition uppercase"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumpad('0')}
                className="h-14 rounded-none bg-secondary hover:bg-muted border border-border text-foreground font-extrabold text-xl active:scale-95 transition shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-none bg-secondary hover:bg-muted border border-border text-muted-foreground font-bold flex items-center justify-center active:scale-95 transition"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Staff Logins */}
            <div className="pt-3 border-t border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5 text-center">
                {dict.auth.quickFill}
              </span>
              <div className="flex gap-1.5 justify-center">
                <button
                  type="button"
                  onClick={() => quickLogin('0000')}
                  className="px-2 py-1 bg-secondary hover:bg-[#f5efe6] text-foreground border border-border text-[10px] font-bold rounded-none transition"
                >
                  {dict.staff.roleCashier} (0000)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('5678')}
                  className="px-2 py-1 bg-secondary hover:bg-[#fdf3e7] text-foreground border border-border text-[10px] font-bold rounded-none transition"
                >
                  {dict.staff.roleManager} (5678)
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('1234')}
                  className="px-2 py-1 bg-secondary hover:bg-[#f5efe6] text-foreground border border-border text-[10px] font-bold rounded-none transition"
                >
                  {dict.staff.roleAdmin} (1234)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Username & Password Login */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{dict.auth.username}</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{dict.auth.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-none transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>{isLoading ? dict.auth.signingIn : dict.auth.signIn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-[#8f4d08]" />
        <span>Local RBAC & Bcrypt Protection</span>
      </div>
    </div>
  )
}
