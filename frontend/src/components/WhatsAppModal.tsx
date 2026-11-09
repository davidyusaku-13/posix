import { useState, useEffect } from 'react'
import {
  MessageSquare,
  X,
  QrCode,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  Loader2,
  Smartphone,
} from 'lucide-react'
import { api } from '../services/api'
import type { NotificationConfig, WhatsAppStatus, NotificationLog } from '../types/pos'
import { ConfirmModal } from './common/ConfirmModal'

interface WhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
}

function normalizePhonePreview(raw: string): string {
  let cleaned = raw.trim().replace(/^https?:\/\/wa\.me\//, '').replace(/^wa\.me\//, '').replace(/^whatsapp:/, '')
  if (cleaned.includes('@')) cleaned = cleaned.split('@')[0]
  if (cleaned.includes(':')) cleaned = cleaned.split(':')[0]
  let digits = cleaned.replace(/\D/g, '')
  if (digits.startsWith('00') && digits.length > 8) digits = digits.slice(2)
  if (digits.startsWith('6208') && digits.length >= 11) digits = '62' + digits.slice(3)
  else if (digits.startsWith('08') && digits.length >= 9) digits = '62' + digits.slice(1)
  else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 12) digits = '62' + digits
  return digits
}

export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  const [activeTab, setActiveTab] = useState<'connection' | 'settings' | 'logs'>('connection')

  // Connection State
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false)

  // Settings State
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [ownerPhone, setOwnerPhone] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [notifyLowStock, setNotifyLowStock] = useState(true)
  const [cooldownMinutes, setCooldownMinutes] = useState(60)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [configSuccessMsg, setConfigSuccessMsg] = useState('')
  const [configErrorMsg, setConfigErrorMsg] = useState('')

  // Test Notification State
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  // Logs State
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // Load Status and Config on open
  useEffect(() => {
    if (!isOpen) return

    fetchStatus()
    fetchConfig()
  }, [isOpen])

  // Polling for QR / connection while modal is open and not yet connected
  useEffect(() => {
    if (!isOpen) return
    if (status?.status === 'connected') return

    const timer = setInterval(() => {
      fetchStatus(true)
    }, 3000)

    return () => clearInterval(timer)
  }, [isOpen, status?.status])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const fetchStatus = async (silent = false) => {
    if (!silent) setIsLoadingStatus(true)
    try {
      const data = await api.getWhatsAppStatus()
      setStatus(data)
    } catch {
      setStatus({ status: 'disconnected', error: 'Bridge offline' })
    } finally {
      if (!silent) setIsLoadingStatus(false)
    }
  }

  const fetchConfig = async () => {
    try {
      const data = await api.getNotificationConfig()
      setConfig(data)
      setOwnerPhone(data.ownerPhone || '')
      setEnabled(data.enabled)
      setNotifyLowStock(data.notifyLowStock)
      setCooldownMinutes(data.cooldownMinutes || 60)
    } catch (err: any) {
      setConfigErrorMsg(err.message || 'Failed to load configuration')
    }
  }

  const fetchLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const data = await api.getNotificationLogs(20)
      setLogs(data)
    } catch {
      setLogs([])
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const handleTabChange = (tab: 'connection' | 'settings' | 'logs') => {
    setActiveTab(tab)
    if (tab === 'logs') {
      fetchLogs()
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingConfig(true)
    setConfigSuccessMsg('')
    setConfigErrorMsg('')

    try {
      const updated = await api.updateNotificationConfig({
        ownerPhone: ownerPhone.trim(),
        enabled,
        notifyLowStock,
        cooldownMinutes,
      })
      setConfig(updated)
      setConfigSuccessMsg('Notification settings successfully updated')
      setTimeout(() => setConfigSuccessMsg(''), 4000)
    } catch (err: any) {
      setConfigErrorMsg(err.message || 'Failed to save settings')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleSendTest = async () => {
    setIsSendingTest(true)
    setTestResult(null)
    const phoneToTest = ownerPhone.trim() || config?.ownerPhone || ''
    try {
      await api.sendTestNotification(phoneToTest)
      setTestResult({
        success: true,
        msg: `Test alert dispatched to +${normalizePhonePreview(phoneToTest)}!`,
      })
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || 'Failed to dispatch test notification',
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await api.disconnectWhatsApp()
      setIsDisconnectConfirmOpen(false)
      fetchStatus()
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-card-foreground border border-border w-full max-w-xl rounded-none shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-[#f5efe6] px-6 py-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                WhatsApp Notifications
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground">
                Baileys Web Bridge • Store Owner Alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-none text-muted-foreground hover:text-foreground hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 bg-muted/40 px-6 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange('connection')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'connection'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Device Pairing
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Alert Settings
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('logs')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Dispatch Logs
          </button>
        </div>

        {/* Tab 1: Device Pairing & QR Code */}
        {activeTab === 'connection' && (
          <div className="p-6 space-y-5">
            {/* Live Connection Status Banner */}
            <div className="flex items-center justify-between p-3 border border-border bg-[#faf7f3] rounded-none">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-none ${
                    status?.status === 'connected'
                      ? 'bg-emerald-600 animate-pulse'
                      : status?.status === 'qr_ready'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Status:{' '}
                    {status?.status === 'connected'
                      ? 'Connected & Authenticated'
                      : status?.status === 'qr_ready'
                      ? 'Pairing Required (Scan QR Code)'
                      : 'Disconnected / Offline'}
                  </span>
                  {status?.connectedPhone && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Linked Number: +{status.connectedPhone}
                    </span>
                  )}
                  {status?.error && (
                    <span className="text-[11px] text-rose-600 block">
                      Note: {status.error}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchStatus()}
                disabled={isLoadingStatus}
                className="px-2.5 py-1 text-[11px] font-medium border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition rounded-none"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* QR Code Presentation */}
            {status?.status === 'qr_ready' && status.qrCode && (
              <div className="flex flex-col items-center justify-center p-6 border border-border bg-white rounded-none space-y-4">
                <img
                  src={status.qrCode}
                  alt="WhatsApp Pairing QR Code"
                  className="w-56 h-56 border border-border/80 shadow-2xs"
                />
                <div className="text-center max-w-sm space-y-1">
                  <p className="text-xs font-bold text-foreground">
                    Scan with your WhatsApp mobile app
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device and point your camera here.
                  </p>
                </div>
              </div>
            )}

            {/* Connected State View */}
            {status?.status === 'connected' && (
              <div className="p-6 border border-emerald-200 bg-emerald-50/50 rounded-none text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto rounded-none">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-bold text-emerald-900">
                  WhatsApp Device Successfully Paired
                </h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Your POSIX terminal is actively connected to WhatsApp. Automated low-stock alerts will be dispatched to the configured store owner phone number.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDisconnectConfirmOpen(true)}
                    className="px-4 py-2 border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 mx-auto rounded-none transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect WhatsApp Session
                  </button>
                </div>
              </div>
            )}

            {/* Offline / Initializing View */}
            {status?.status !== 'connected' && status?.status !== 'qr_ready' && (
              <div className="p-6 border border-border bg-[#faf7f3] text-center space-y-2 rounded-none">
                <Smartphone className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="text-xs font-bold text-foreground">
                  Baileys Service Initializing
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  Ensure the local WhatsApp bridge is running via{' '}
                  <code className="bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    bun run bridge/whatsapp/index.ts
                  </code>
                  .
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Alert Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
            {configSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-none text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{configSuccessMsg}</span>
              </div>
            )}

            {configErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-none text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{configErrorMsg}</span>
              </div>
            )}

            {/* Store Owner Phone */}
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Store Owner WhatsApp Number
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. 081234567890, +6281234567890, or +14155552671"
                className="w-full px-3 py-2 border border-border rounded-none text-sm font-mono text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Accepts 08xxx, +62xxx, or international format.</span>
                {ownerPhone.trim() && (
                  <span className="font-mono text-foreground font-semibold">
                    Target: +{normalizePhonePreview(ownerPhone)}
                  </span>
                )}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="mt-0.5 rounded-none text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Master WhatsApp Notifications Toggle
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Enables or suppresses all outbound WhatsApp dispatching.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyLowStock}
                  onChange={(e) => setNotifyLowStock(e.target.checked)}
                  className="mt-0.5 rounded-none text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Low Stock Threshold Alerts (FR-8.2)
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Sends an alert when inventory falls to or below minimum threshold.
                  </span>
                </div>
              </label>
            </div>

            {/* Cooldown Settings */}
            <div className="pt-2 border-t border-border/80">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Notification Cooldown Window
              </label>
              <select
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-border rounded-none text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour (Recommended)</option>
                <option value={120}>2 Hours</option>
                <option value={360}>6 Hours</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Prevents alert flooding for repeated sales of the same low-stock item.
              </p>
            </div>

            {/* Test Notification Section */}
            <div className="p-3.5 border border-border bg-[#faf7f3] rounded-none flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Verify WhatsApp Channel
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Dispatches an instant test message to the owner's phone.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || !ownerPhone}
                className="px-3 py-1.5 border border-border bg-card hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition rounded-none disabled:opacity-50"
              >
                {isSendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Test Alert
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-none text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{testResult.msg}</span>
              </div>
            )}

            {/* Save Buttons */}
            <div className="pt-4 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-none"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-none transition flex items-center gap-1.5"
              >
                {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Preferences
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Dispatch Logs */}
        {activeTab === 'logs' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Recent notification dispatches and delivery statuses:
              </p>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="px-2.5 py-1 text-[11px] font-medium border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition rounded-none"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                Refresh Logs
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Loading dispatch ledger...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 border border-border text-center text-xs text-muted-foreground bg-[#faf7f3] rounded-none">
                No notification events recorded yet.
              </div>
            ) : (
              <div className="border border-border rounded-none overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5efe6] border-b border-border text-foreground font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">Recipient</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/40 font-mono text-[11px]">
                        <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                          {log.createdAt}
                        </td>
                        <td className="p-2.5 font-bold uppercase text-foreground">
                          {log.eventType}
                        </td>
                        <td className="p-2.5 text-foreground">{log.recipient}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-none ${
                              log.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : log.status === 'failed'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={isDisconnectConfirmOpen}
        title="Disconnect WhatsApp Session?"
        description="Logging out will terminate the Baileys multi-device connection. You will need to re-scan the QR code to receive alerts again."
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleDisconnect}
        onCancel={() => setIsDisconnectConfirmOpen(false)}
      />
    </div>
  )
}
