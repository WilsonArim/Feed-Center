import express from 'express'
import cors from 'cors'
import { env } from './config.js'
import { newsRouter } from './routes/newsRoutes.js'
import { cortexRouterRoutes } from './routes/cortexRoutes.js'
import authRoutes from './routes/authRoutes.js'

// Import worker to start processing jobs
import './workers/newsWorker.js'
import './workers/morningBriefingWorker.js'
import './workers/proactiveAlertsWorker.js'

// Telegram Sidecar (sovereign bridge)
import { startTelegramSidecar } from './services/telegramSidecar.js'

const app = express()

const defaultCorsOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://feed-center.vercel.app',
]

const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const allowedOrigins = new Set([...defaultCorsOrigins, ...configuredCorsOrigins])

function isAllowedOrigin(origin: string): boolean {
    if (allowedOrigins.has(origin)) return true

    try {
        const url = new URL(origin)
        return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app')
    } catch {
        return false
    }
}

// ── Middleware ──
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
            callback(null, true)
            return
        }
        callback(new Error(`CORS blocked for origin: ${origin}`))
    },
}))
app.use(express.json({ limit: '1mb' }))

// ── Health check ──
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ──
app.use(newsRouter)
app.use(cortexRouterRoutes)
app.use('/api/auth', authRoutes)

// ── Start ──
app.listen(env.port, () => {
    console.log(`
╔══════════════════════════════════════╗
║  Feed-Center News Server             ║
║  Port: ${env.port}                        ║
║  Redis: ${env.redisUrl.slice(0, 25)}        ║
║  Cortex: ${env.cortexDataDir.slice(0, 24)}...   ║
║  Workers: news + briefing + alerts   ║
╚══════════════════════════════════════╝
    `)

    // Launch Telegram Sidecar (non-blocking, only if env vars present)
    void startTelegramSidecar()
})

export { app }
