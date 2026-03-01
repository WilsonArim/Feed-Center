import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useCopilotAvatarUrl, useCopilotName } from '@/hooks/useUserSettings'
import { DEFAULT_COPILOT_AVATAR_URL } from '@/services/userSettingsService'
import { cortexBridgeService } from '@/services/cortexBridgeService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { queryClient } from '@/lib/queryClient'
import { PremiumInputBar } from '@/components/core/PremiumInputBar'

// Query keys for cache invalidation after Cortex mutations
const MODULE_QUERY_KEYS: Record<string, string[]> = {
    FinanceModule: ['finances', 'financial_entries'],
    TodoModule: ['todos', 'todo_lists'],
    CryptoModule: ['crypto', 'defi_positions'],
    LinksModule: ['links'],
}

type EngineStatus = 'idle' | 'listening' | 'processing' | 'speaking'

export function EnginePane() {
    const { txt } = useLocaleText()
    const { user } = useAuth()
    const copilotNameQuery = useCopilotName()
    const copilotAvatarQuery = useCopilotAvatarUrl()
    const copilotName = copilotNameQuery.data ?? 'Buggy'
    const avatarUrl = copilotAvatarQuery.data ?? DEFAULT_COPILOT_AVATAR_URL

    const showDraft = useWorkspaceStore((s) => s.showDraft)
    const showSuccess = useWorkspaceStore((s) => s.showSuccess)
    const showError = useWorkspaceStore((s) => s.showError)
    const showReply = useWorkspaceStore((s) => s.showReply)
    const setView = useWorkspaceStore((s) => s.setView)

    const [status, setStatus] = useState<EngineStatus>('idle')
    const [lastMessage, setLastMessage] = useState<string | null>(null)
    const [liveVoiceReply, setLiveVoiceReply] = useState<string | null>(null)

    /** Dispatch signal and optionally return the reply text (for voice TTS) */
    const dispatchSignal = useCallback(async (text: string, source: 'text' | 'voice' = 'text'): Promise<string | null> => {
        if (!text || !user || status === 'processing') return null

        setStatus('processing')
        setView({ kind: 'processing' })

        try {
            const result = await cortexBridgeService.routeSignal(text, source)

            if (!result) {
                showError(txt('Sem resposta do servidor', 'No server response'))
                setStatus('idle')
                return null
            }

            const isAutoCommitted = result.reason?.some((r: string) => r.includes('auto_commit=true'))

            if (isAutoCommitted) {
                const summary = result.financeDraft
                    ? `${result.financeDraft.merchant} • ${result.financeDraft.amount} ${result.financeDraft.currency}`
                    : text.slice(0, 60)
                showSuccess(result.route, result.rawSignalId, summary)
                setLastMessage(txt('✅ Auto-executado', '✅ Auto-committed'))
                const keys = MODULE_QUERY_KEYS[result.route] ?? []
                for (const key of keys) {
                    void queryClient.invalidateQueries({ queryKey: [key] })
                }
                return txt('Feito!', 'Done!')
            } else if (result.nextAction === 'query_openai_with_context') {
                try {
                    const chatReply = await cortexBridgeService.chat(text)
                    showReply(chatReply)
                    setLastMessage(txt('💬 Buggy respondeu', '💬 Buggy replied'))
                    return chatReply
                } catch {
                    const fallback = txt('Estou aqui. O que precisas?', 'I\'m here. What do you need?')
                    showReply(fallback)
                    setLastMessage(txt('💬 Buggy respondeu', '💬 Buggy replied'))
                    return fallback
                }
            } else if (result.nextAction?.startsWith('ambient_')) {
                const draft = result.financeDraft ?? result.moduleDraft ?? {}
                showDraft({
                    module: result.route,
                    draft: draft as Record<string, unknown>,
                    rawSignalId: result.rawSignalId,
                    missingFields: [],
                    walletHint: (result.financeDraft as Record<string, unknown> | null)?.walletId as string | null ?? null,
                })
                setLastMessage(txt('💡 Draft criado', '💡 Draft created'))
                return txt('Draft criado. Confirma os dados.', 'Draft created. Please confirm.')
            } else {
                showError(txt('Resposta inesperada', 'Unexpected response'))
                return null
            }
        } catch {
            showError(txt('❌ Erro na ligação', '❌ Connection error'))
            return null
        } finally {
            setStatus('idle')
        }
    }, [user, status, txt, setView, showDraft, showSuccess, showError, showReply])

    /** Handle live voice transcript: dispatch to cortex, then trigger TTS reply */
    const handleLiveVoiceTranscript = useCallback(async (transcript: string) => {
        const reply = await dispatchSignal(transcript, 'voice')
        if (reply) {
            setLiveVoiceReply(reply)
        }
    }, [dispatchSignal])

    return (
        <div className="engine-inner">
            {/* Status indicator */}
            <div className="engine-status">
                <div className={`engine-status-dot ${status}`} />
                <span className="engine-status-label">
                    {status === 'idle' && copilotName}
                    {status === 'processing' && txt('A processar...', 'Processing...')}
                    {status === 'listening' && txt('A ouvir...', 'Listening...')}
                    {status === 'speaking' && txt('A falar...', 'Speaking...')}
                </span>
            </div>

            {/* Avatar */}
            <div className="engine-avatar-zone">
                <motion.div
                    className="engine-avatar"
                    animate={status === 'processing' ? { scale: [1, 1.04, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                    <img
                        src={avatarUrl}
                        alt={copilotName}
                        className="engine-avatar-img"
                        onError={(e) => { e.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL }}
                    />
                    {/* Glow ring */}
                    <div className={`engine-avatar-ring ${status}`} />
                </motion.div>
            </div>

            {/* Last message */}
            {lastMessage && (
                <div className="engine-last-message">
                    {lastMessage}
                </div>
            )}

            {/* Premium Input Bar */}
            <div className="w-full max-w-[320px]">
                <PremiumInputBar
                    onSend={(text) => void dispatchSignal(text)}
                    onLiveVoiceTranscript={(t) => void handleLiveVoiceTranscript(t)}
                    liveVoiceReply={liveVoiceReply}
                    onLiveVoiceReplyDone={() => setLiveVoiceReply(null)}
                    processing={status === 'processing'}
                />
            </div>

            {/* Slash hint */}
            <div className="engine-hint">
                <span className="engine-hint-key">/</span>
                {txt('para focar', 'to focus')}
            </div>
        </div>
    )
}
