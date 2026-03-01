import { Router, type Request, type Response } from 'express'
import path from 'node:path'
import multer from 'multer'
import OpenAI, { toFile } from 'openai'
import { agentAuth } from '../middleware/agentAuth.js'
import { cortexRouter } from '../services/cortex/cortexRouter.js'
import { TtsDiskCache } from '../services/cortex/ttsDiskCache.js'
import { CortexHandshakePayloadSchema, CortexRoutePayloadSchema } from '../types/cortex.js'
import { env } from '../config.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })
const openai = new OpenAI({ apiKey: env.openaiKey })

const ttsCache = new TtsDiskCache({
    cacheDir: path.join(env.cortexDataDir ?? 'data/cortex', 'tts-cache'),
})

function parseBooleanQuery(value: unknown): boolean {
    if (typeof value !== 'string') return false
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function parsePositiveIntQuery(value: unknown, fallback: number, max = 100): number {
    if (typeof value !== 'string' || !value.trim()) return fallback
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    const rounded = Math.round(parsed)
    if (rounded <= 0) return fallback
    return Math.min(rounded, max)
}

async function handleRouteSignal(req: Request, res: Response) {
    const parsed = CortexRoutePayloadSchema.safeParse(req.body)
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid payload',
            details: parsed.error.flatten().fieldErrors,
        })
        return
    }

    try {
        const decision = await cortexRouter.routeSignal({
            signalType: parsed.data.signal_type,
            rawText: parsed.data.raw_text,
            channel: parsed.data.channel,
            metadata: parsed.data.metadata,
            ocrTrace: parsed.data.ocr_trace,
        })

        res.json({
            status: 'ok',
            decision,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        res.status(500).json({ error: message })
    }
}

async function handleRecordHandshake(req: Request, res: Response) {
    const parsed = CortexHandshakePayloadSchema.safeParse(req.body)
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid payload',
            details: parsed.error.flatten().fieldErrors,
        })
        return
    }

    try {
        const event = await cortexRouter.recordHandshake({
            rawSignalId: parsed.data.raw_signal_id,
            module: parsed.data.module,
            status: parsed.data.status,
            confidence: parsed.data.confidence ?? null,
            payload: parsed.data.payload,
            memory: parsed.data.memory,
        })

        res.json({
            status: 'ok',
            event,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        res.status(500).json({ error: message })
    }
}

async function handleGetTodayBriefing(req: Request, res: Response) {
    const userId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : ''
    if (!userId) {
        res.status(400).json({ error: 'Missing query param: user_id' })
        return
    }

    const forceRefresh = parseBooleanQuery(req.query.force_refresh)
    const briefingDate = typeof req.query.briefing_date === 'string'
        ? req.query.briefing_date.trim()
        : undefined

    try {
        const briefing = await cortexRouter.getTodayBriefing(userId, {
            forceRefresh,
            briefingDate: briefingDate || undefined,
        })
        res.json({
            status: 'ok',
            briefing,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        res.status(500).json({ error: message })
    }
}

async function handleGetPendingAlerts(req: Request, res: Response) {
    const userId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : ''
    if (!userId) {
        res.status(400).json({ error: 'Missing query param: user_id' })
        return
    }

    const refreshFirst = parseBooleanQuery(req.query.refresh_first)
    const limit = parsePositiveIntQuery(req.query.limit, 20, 100)

    try {
        if (refreshFirst) {
            await cortexRouter.refreshProactiveAlertsForUser(userId)
        }

        const alerts = cortexRouter.consumePendingProactiveAlerts(userId, limit)
        res.json({
            status: 'ok',
            alerts,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        res.status(500).json({ error: message })
    }
}

async function handleTranscribe(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
        res.status(400).json({ error: 'Missing audio file' })
        return
    }

    try {
        const language = (typeof req.body?.language === 'string' ? req.body.language : 'pt') as string
        const prompt = (typeof req.body?.prompt === 'string' ? req.body.prompt : '') as string

        const transcription = await openai.audio.transcriptions.create({
            file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
            model: 'whisper-1',
            language,
            response_format: 'text',
            temperature: 0,
            ...(prompt ? { prompt } : {}),
        })

        // response_format: 'text' returns a plain string
        res.type('text/plain').send(transcription as unknown as string)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Transcription failed'
        console.error('[cortex/transcribe] error:', message)
        res.status(502).json({ error: message })
    }
}

async function handleTts(req: Request, res: Response) {
    const { input, voice = 'nova', response_format = 'opus', speed = 1, instructions } = req.body ?? {}
    if (!input || typeof input !== 'string') {
        res.status(400).json({ error: 'Missing "input" field' })
        return
    }

    try {
        const cached = ttsCache.lookup(input, voice)
        if (cached) {
            res.set('X-TTS-Cache', 'HIT')
            res.set('Content-Type', 'audio/opus')
            res.send(cached)
            return
        }

        const speech = await openai.audio.speech.create({
            model: 'tts-1',
            voice,
            input,
            response_format,
            speed,
            ...(instructions ? { instructions } : {}),
        })

        const arrayBuffer = await speech.arrayBuffer()
        const audioBuffer = Buffer.from(arrayBuffer)

        ttsCache.store(input, voice, audioBuffer)

        res.set('X-TTS-Cache', 'MISS')
        res.set('Content-Type', 'audio/opus')
        res.send(audioBuffer)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'TTS failed'
        console.error('[cortex/tts] error:', message)
        res.status(502).json({ error: message })
    }
}

async function handleChat(req: Request, res: Response) {
    const { model = 'gpt-4o-mini', messages, temperature = 0.4, max_tokens = 400 } = req.body ?? {}
    if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Missing "messages" array' })
        return
    }

    try {
        const completion = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens,
        })

        res.json(completion)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Chat failed'
        console.error('[cortex/chat] error:', message)
        res.status(502).json({ error: message })
    }
}

function handleGetProfile(req: Request, res: Response) {
    try {
        const key = typeof req.query.key === 'string' ? req.query.key.trim() : ''
        if (key) {
            const value = cortexRouter.profile.get(key)
            res.json({ status: 'ok', key, value })
        } else {
            const all = cortexRouter.profile.getAll()
            res.json({ status: 'ok', profile: all })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Profile read failed'
        res.status(500).json({ error: message })
    }
}

function handleSetProfile(req: Request, res: Response) {
    const { key, value } = req.body ?? {}
    if (!key || typeof key !== 'string') {
        res.status(400).json({ error: 'Missing "key" field' })
        return
    }

    try {
        cortexRouter.profile.set(key, value)
        res.json({ status: 'ok', key })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Profile write failed'
        res.status(500).json({ error: message })
    }
}

function handleCacheStats(_req: Request, res: Response) {
    try {
        const ttsStats = ttsCache.stats()
        const ttsHitRate = ttsCache.cacheHitRate()
        res.json({
            status: 'ok',
            tts: { ...ttsStats, ...ttsHitRate },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Stats failed'
        res.status(500).json({ error: message })
    }
}

// ── DUAL-LLM ARCHITECTURE: Lane-Aware Vision Upload ───────────────
// Accepts `lane` param in the multipart body:
//   'smart_chat'  → Qwen OCR → OpenAI routing (default)
//   'manual_scan' → Qwen OCR → direct to UI (zero tokens)
async function handleVisionUpload(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
        res.status(400).json({ error: 'Missing image file. Use multipart "image" field.' })
        return
    }

    try {
        const imageBase64 = file.buffer.toString('base64')
        const mimeType = file.mimetype || 'image/png'
        const metadata = req.body?.metadata ? JSON.parse(req.body.metadata) : undefined
        const lane = req.body?.lane === 'manual_scan' ? 'manual_scan' as const : 'smart_chat' as const

        const decision = await cortexRouter.routeImageSignal(imageBase64, mimeType, metadata, lane)

        res.json({
            status: 'ok',
            lane,
            decision,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Vision processing failed'
        console.error('[cortex/vision] error:', message)
        res.status(502).json({ error: message })
    }
}

// ── DUAL-LLM ARCHITECTURE: State Sync (Risk 4 Solution) ──────────
// When the human edits OCR data in the editable UI and saves,
// this endpoint corrects OpenAI's contextual memory with the final
// human-validated values. Qwen has NO state — only the ledger +
// synaptic memory are updated.
async function handleSyncVisionContext(req: Request, res: Response) {
    const { raw_signal_id, corrected_draft } = req.body ?? {}

    if (!raw_signal_id || typeof raw_signal_id !== 'string') {
        res.status(400).json({ error: 'Missing "raw_signal_id" field' })
        return
    }
    if (!corrected_draft || typeof corrected_draft !== 'object') {
        res.status(400).json({ error: 'Missing "corrected_draft" object' })
        return
    }

    try {
        cortexRouter.syncVisionContext(raw_signal_id, {
            merchant: corrected_draft.merchant ?? null,
            amount: typeof corrected_draft.amount === 'number' ? corrected_draft.amount : null,
            currency: corrected_draft.currency ?? 'EUR',
            category: corrected_draft.category ?? 'Outros',
            description: corrected_draft.description ?? '',
            confidence: 1.0,
            strictParametersMet: true,
            walletId: corrected_draft.walletId ?? null,
        })

        res.json({ status: 'ok', synced: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed'
        console.error('[cortex/sync-vision-context] error:', message)
        res.status(500).json({ error: message })
    }
}

async function handleVisionStatus(_req: Request, res: Response) {
    try {
        const available = await cortexRouter.isVisionAvailable()
        res.json({
            status: 'ok',
            vision: {
                available,
                sidecar: env.mlxSidecarUrl,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Status check failed'
        res.status(500).json({ error: message })
    }
}

router.post('/cortex/route', handleRouteSignal)
router.post('/internal/cortex/route', agentAuth, handleRouteSignal)

router.post('/cortex/handshake', handleRecordHandshake)
router.post('/internal/cortex/handshake', agentAuth, handleRecordHandshake)

router.get('/cortex/briefing/today', handleGetTodayBriefing)
router.get('/internal/cortex/briefing/today', agentAuth, handleGetTodayBriefing)

router.get('/cortex/alerts/pending', handleGetPendingAlerts)
router.get('/internal/cortex/alerts/pending', agentAuth, handleGetPendingAlerts)

router.post('/cortex/transcribe', upload.single('file'), handleTranscribe)
router.post('/cortex/tts', handleTts)
router.post('/cortex/chat', handleChat)
router.post('/internal/cortex/chat', agentAuth, handleChat)

router.get('/cortex/profile', handleGetProfile)
router.post('/cortex/profile', handleSetProfile)

router.get('/cortex/cache/stats', handleCacheStats)

router.post('/cortex/vision', upload.single('image'), handleVisionUpload)
router.post('/internal/cortex/vision', agentAuth, upload.single('image'), handleVisionUpload)
router.get('/cortex/vision/status', handleVisionStatus)

// Dual-LLM: State sync for human-edited OCR data (Risk 4)
router.post('/cortex/sync-vision-context', handleSyncVisionContext)
router.post('/internal/cortex/sync-vision-context', agentAuth, handleSyncVisionContext)

export { router as cortexRouterRoutes }

