/**
 * Telegram Sidecar — Sovereign Bridge to the Cortex
 *
 * Runs alongside the Express backend as a Telegram bot. Filters by
 * a single USER_ID (sovereign mode — only the owner can interact).
 *
 * Capabilities:
 *   - Text messages → cortexRouter.routeSignal (channel: 'telegram')
 *   - Voice notes (.ogg) → Whisper transcription → routeSignal
 *   - Inline keyboard for draft confirmation/rejection → recordHandshake
 *   - Auto-commit feedback with summary
 */

import { Telegraf, type Context } from 'telegraf'
import type { Update, Message } from 'telegraf/types'
import OpenAI, { toFile } from 'openai'
import { env } from '../config.js'
import { cortexRouter } from './cortex/cortexRouter.js'
import type { CortexRouteResult, HandshakeStatus } from './cortex/types.js'

// ── OpenAI client for Whisper transcription ──
const openai = new OpenAI({ apiKey: env.openaiKey })

// ── Sovereign gate: only this user can interact ──
const OWNER_ID = env.telegramUserId ? Number(env.telegramUserId) : 0

function isOwner(ctx: Context): boolean {
    return ctx.from?.id === OWNER_ID
}

// ── Helpers ──

function truncate(text: string, max = 120): string {
    return text.length > max ? text.slice(0, max) + '…' : text
}

function formatDecisionMessage(result: CortexRouteResult, originalText: string): string {
    const isAutoCommit = result.reason?.some((r) => r.includes('auto_commit=true'))

    if (isAutoCommit) {
        const summary = result.financeDraft
            ? `${result.financeDraft.merchant} • ${result.financeDraft.amount} ${result.financeDraft.currency}`
            : truncate(originalText, 60)
        return `✅ *Auto-executado*\n\n📦 Módulo: \`${result.route}\`\n📝 ${summary}\n🎯 Confiança: ${(result.confidence * 100).toFixed(0)}%`
    }

    if (result.nextAction === 'query_openai_with_context') {
        return '💬 Processando resposta...'
    }

    if (result.nextAction?.startsWith('ambient_')) {
        const draft = result.financeDraft ?? result.moduleDraft ?? {}
        const draftLines = Object.entries(draft)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `  ${k}: \`${v}\``)
            .join('\n')
        return `💡 *Draft criado*\n\n📦 Módulo: \`${result.route}\`\n${draftLines}`
    }

    return `⚙️ Processado → \`${result.route}\` (${result.nextAction})`
}

// ── Build inline keyboard for draft confirmation ──
function buildDraftKeyboard(rawSignalId: string, module: string) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Confirmar', callback_data: `confirm:${rawSignalId}:${module}` },
                { text: '❌ Rejeitar', callback_data: `reject:${rawSignalId}:${module}` },
            ],
        ],
    }
}

// ── Transcribe voice note via Whisper ──
async function transcribeVoiceNote(fileBuffer: Buffer, filename: string): Promise<string> {
    const transcription = await openai.audio.transcriptions.create({
        file: await toFile(fileBuffer, filename, { type: 'audio/ogg' }),
        model: 'whisper-1',
        language: 'pt',
        response_format: 'text',
        temperature: 0,
    })
    return (transcription as unknown as string).trim()
}

// ── Route text through Cortex ──
async function routeTextToCortex(
    text: string,
    signalType: 'text' | 'voice',
): Promise<CortexRouteResult> {
    return cortexRouter.routeSignal({
        signalType,
        rawText: text,
        channel: 'telegram',
    })
}

// ── Handle cortex response + optional chat reply ──
async function handleCortexResult(
    ctx: Context,
    result: CortexRouteResult,
    originalText: string,
): Promise<void> {
    const isAutoCommit = result.reason?.some((r) => r.includes('auto_commit=true'))

    if (isAutoCommit) {
        await ctx.replyWithMarkdownV2(escapeMarkdownV2(formatDecisionMessage(result, originalText)))
        return
    }

    if (result.nextAction === 'query_openai_with_context') {
        // Get a chat reply from cortex
        try {
            const chatResult = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Eres Buggy, un asistente financiero conciso. Contexto:\n${result.contextMarkdown ?? ''}`,
                    },
                    { role: 'user', content: originalText },
                ],
                temperature: 0.4,
                max_tokens: 400,
            })
            const reply = chatResult.choices[0]?.message?.content || 'Sem resposta.'
            await ctx.reply(reply)
        } catch {
            await ctx.reply('❌ Erro ao processar resposta do chat.')
        }
        return
    }

    if (result.nextAction?.startsWith('ambient_')) {
        await ctx.reply(formatDecisionMessage(result, originalText), {
            parse_mode: 'Markdown',
            reply_markup: buildDraftKeyboard(result.rawSignalId, result.route),
        })
        return
    }

    await ctx.reply(formatDecisionMessage(result, originalText), { parse_mode: 'Markdown' })
}

// Escape special chars for MarkdownV2
function escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
}

// ── Create and configure the bot ──
export function createTelegramSidecar(): Telegraf | null {
    if (!env.telegramBotToken) {
        console.log('[telegram] No TELEGRAM_BOT_TOKEN set — sidecar disabled.')
        return null
    }

    if (!OWNER_ID) {
        console.log('[telegram] No TELEGRAM_USER_ID set — sidecar disabled.')
        return null
    }

    const bot = new Telegraf(env.telegramBotToken)

    // ── Sovereign gate middleware ──
    bot.use((ctx, next) => {
        if (!isOwner(ctx)) {
            // Silently drop non-owner messages
            return
        }
        return next()
    })

    // ── /start command ──
    bot.start((ctx) => {
        ctx.reply(
            '🐛 *Buggy Telegram Sidecar*\n\n' +
            'Estou ligado ao teu Cortex local.\n' +
            'Envia texto ou notas de voz.\n\n' +
            '`/gastos 50 EUR almoço`\n' +
            '`/todo comprar leite`',
            { parse_mode: 'Markdown' },
        )
    })

    // ── Text messages ──
    bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim()
        if (!text || text.startsWith('/start')) return

        try {
            await ctx.sendChatAction('typing')
            const result = await routeTextToCortex(text, 'text')
            await handleCortexResult(ctx, result, text)
        } catch (err) {
            console.error('[telegram] text route error:', err)
            await ctx.reply('❌ Erro na ligação ao Cortex.')
        }
    })

    // ── Voice notes ──
    bot.on('voice', async (ctx) => {
        try {
            await ctx.sendChatAction('typing')

            // Download the voice file from Telegram
            const fileId = ctx.message.voice.file_id
            const fileLink = await ctx.telegram.getFileLink(fileId)
            const response = await fetch(fileLink.href)
            const arrayBuffer = await response.arrayBuffer()
            const fileBuffer = Buffer.from(arrayBuffer)

            // Transcribe via Whisper
            const transcript = await transcribeVoiceNote(fileBuffer, `voice_${fileId}.ogg`)

            if (!transcript) {
                await ctx.reply('🔇 Não consegui transcrever a nota de voz.')
                return
            }

            await ctx.reply(`🎤 _${truncate(transcript, 200)}_`, { parse_mode: 'Markdown' })

            // Route the transcription through Cortex
            const result = await routeTextToCortex(transcript, 'voice')
            await handleCortexResult(ctx, result, transcript)
        } catch (err) {
            console.error('[telegram] voice route error:', err)
            await ctx.reply('❌ Erro ao processar nota de voz.')
        }
    })

    // ── Inline keyboard callbacks (draft confirm/reject) ──
    bot.on('callback_query', async (ctx) => {
        const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined
        if (!data) return

        const [action, rawSignalId, module] = data.split(':')
        if (!rawSignalId || !module) {
            await ctx.answerCbQuery('Dados inválidos.')
            return
        }

        const status: HandshakeStatus = action === 'confirm' ? 'approved' : 'rejected'

        try {
            await cortexRouter.recordHandshake({
                rawSignalId,
                module: module as any,
                status,
                confidence: status === 'approved' ? 1.0 : null,
                payload: {},
            })

            const emoji = status === 'approved' ? '✅' : '❌'
            const label = status === 'approved' ? 'Confirmado' : 'Rejeitado'
            await ctx.editMessageText(`${emoji} ${label} — \`${module}\``, { parse_mode: 'Markdown' })
            await ctx.answerCbQuery(label)
        } catch (err) {
            console.error('[telegram] handshake error:', err)
            await ctx.answerCbQuery('Erro ao processar.')
        }
    })

    return bot
}

// ── Launch (with graceful shutdown) ──
export async function startTelegramSidecar(): Promise<void> {
    const bot = createTelegramSidecar()
    if (!bot) return

    // Graceful shutdown
    const stopSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
    for (const signal of stopSignals) {
        process.once(signal, () => {
            console.log(`[telegram] Received ${signal}, stopping bot...`)
            bot.stop(signal)
        })
    }

    try {
        await bot.launch()
        console.log(`[telegram] 🐛 Buggy Sidecar online — sovereign mode (user: ${OWNER_ID})`)
    } catch (err) {
        console.error('[telegram] Failed to start bot:', err)
    }
}
