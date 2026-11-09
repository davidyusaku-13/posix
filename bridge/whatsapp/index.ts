import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const PORT = parseInt(process.env.WHATSAPP_BRIDGE_PORT || '8081', 10)
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || join(process.cwd(), 'data', 'whatsapp_auth')

const logger = pino({ level: 'silent' })

interface BridgeState {
  status: 'initializing' | 'qr_ready' | 'connected' | 'disconnected'
  qrCode: string
  rawQR: string
  connectedPhone: string
  error: string
}

const state: BridgeState = {
  status: 'initializing',
  qrCode: '',
  rawQR: '',
  connectedPhone: '',
  error: '',
}

let sock: WASocket | null = null
let isShuttingDown = false

async function startWhatsAppSocket() {
  if (isShuttingDown) return

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    sock = makeWASocket({
      auth: authState,
      logger,
      printQRInTerminal: true,
      syncFullHistory: false,
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        state.status = 'qr_ready'
        state.rawQR = qr
        state.error = ''
        try {
          state.qrCode = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: {
              dark: '#1e293b',
              light: '#ffffff',
            },
          })
        } catch (e: any) {
          logger.error({ err: e }, 'Failed to generate QR data URL')
        }
      }

      if (connection === 'open') {
        state.status = 'connected'
        state.qrCode = ''
        state.rawQR = ''
        state.error = ''
        const userJid = sock?.user?.id || ''
        state.connectedPhone = userJid.split(':')[0] || userJid.split('@')[0] || ''
        console.log(`[WhatsApp Bridge] Successfully connected as ${state.connectedPhone}`)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        state.status = 'disconnected'
        state.qrCode = ''
        state.connectedPhone = ''

        if (statusCode === DisconnectReason.loggedOut) {
          state.error = 'Logged out from WhatsApp'
          console.log('[WhatsApp Bridge] Session logged out. Clearing auth credentials...')
          try {
            if (existsSync(AUTH_DIR)) {
              rmSync(AUTH_DIR, { recursive: true, force: true })
            }
          } catch (err) {
            console.error('Failed to clean auth directory:', err)
          }
          if (!isShuttingDown) {
            setTimeout(startWhatsAppSocket, 3000)
          }
        } else {
          state.error = (lastDisconnect?.error as Error)?.message || 'Connection closed'
          console.log(`[WhatsApp Bridge] Connection closed (${statusCode}). Reconnecting in 5s...`)
          if (!isShuttingDown) {
            setTimeout(startWhatsAppSocket, 5000)
          }
        }
      }
    })
  } catch (err: any) {
    state.status = 'disconnected'
    state.error = err?.message || 'Failed to initialize socket'
    console.error('[WhatsApp Bridge] Initialization error:', err)
    if (!isShuttingDown) {
      setTimeout(startWhatsAppSocket, 5000)
    }
  }
}

// Start the WhatsApp client
startWhatsAppSocket()

// HTTP API Server powered by Bun
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS Headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    // GET /status
    if (req.method === 'GET' && url.pathname === '/status') {
      return new Response(JSON.stringify(state), { headers })
    }

    // POST /send
    if (req.method === 'POST' && url.pathname === '/send') {
      try {
        const body = (await req.json()) as { phone?: string; message?: string }
        if (!body.phone || !body.message) {
          return new Response(
            JSON.stringify({ error: 'phone and message fields are required' }),
            { status: 400, headers }
          )
        }

        if (state.status !== 'connected' || !sock) {
          return new Response(
            JSON.stringify({
              error: 'WhatsApp is not connected. Scan QR code first.',
              status: state.status,
            }),
            { status: 422, headers }
          )
        }

        // Normalize phone number to WhatsApp JID format
        const cleanPhone = body.phone.replace(/\D/g, '')
        const jid = cleanPhone.includes('@s.whatsapp.net')
          ? cleanPhone
          : `${cleanPhone}@s.whatsapp.net`

        await sock.sendMessage(jid, { text: body.message })

        return new Response(
          JSON.stringify({
            status: 'delivered',
            recipient: jid,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers }
        )
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err?.message || 'Failed to send message' }),
          { status: 500, headers }
        )
      }
    }

    // POST /disconnect
    if (req.method === 'POST' && url.pathname === '/disconnect') {
      try {
        if (sock) {
          await sock.logout()
        }
        if (existsSync(AUTH_DIR)) {
          rmSync(AUTH_DIR, { recursive: true, force: true })
        }
        state.status = 'disconnected'
        state.qrCode = ''
        state.connectedPhone = ''
        state.error = 'Session disconnected'

        return new Response(
          JSON.stringify({ status: 'disconnected', message: 'Logged out successfully' }),
          { status: 200, headers }
        )
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err?.message || 'Failed to logout' }),
          { status: 500, headers }
        )
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    })
  },
})

console.log(`[WhatsApp Bridge] HTTP Server listening on http://127.0.0.1:${server.port}`)

// Graceful cleanup
process.on('SIGINT', async () => {
  isShuttingDown = true
  server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  isShuttingDown = true
  server.stop()
  process.exit(0)
})
