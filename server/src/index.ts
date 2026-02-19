import express from 'express'
import cors from 'cors'
import { env } from './config.js'
import { newsRouter } from './routes/newsRoutes.js'

// Import worker to start processing jobs
import './workers/newsWorker.js'

const app = express()

// ── Middleware ──
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json({ limit: '1mb' }))

// ── Health check ──
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ──
app.use(newsRouter)

// ── Start ──
app.listen(env.port, () => {
    console.log(`
╔══════════════════════════════════════╗
║  Feed-Center News Server             ║
║  Port: ${env.port}                        ║
║  Redis: ${env.redisUrl.slice(0, 25)}        ║
║  Worker: active (concurrency=2)      ║
╚══════════════════════════════════════╝
    `)
})

export { app }
