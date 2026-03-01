import { useCallback, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useCopilotAvatarUrl, useCopilotName } from '@/hooks/useUserSettings'
import { DEFAULT_COPILOT_AVATAR_URL } from '@/services/userSettingsService'
import { cortexBridgeService } from '@/services/cortexBridgeService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { queryClient } from '@/lib/queryClient'
import { PremiumInputBar } from '@/components/core/PremiumInputBar'

const MODULE_QUERY_KEYS: Record<string, string[]> = {
    FinanceModule: ['finances', 'financial_entries'],
    TodoModule: ['todos', 'todo_lists'],
    CryptoModule: ['crypto', 'defi_positions'],
    LinksModule: ['links'],
}

/* ── Buggy FAB ─────────────────────────────────────────────── */

interface BuggyFABProps {
    onClick: () => void
}

export function BuggyFAB({ onClick }: BuggyFABProps) {
    const copilotAvatarQuery = useCopilotAvatarUrl()
    const avatarUrl = copilotAvatarQuery.data ?? DEFAULT_COPILOT_AVATAR_URL

    return (
        <motion.button
            type="button"
            onClick={onClick}
            className="fixed z-[78] w-14 h-14 rounded-full overflow-hidden
                border border-[var(--accent)]/40
                shadow-[0_0_40px_rgba(255,90,0,0.3)] cursor-pointer
                bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] left-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Invoke Buggy"
        >
            <img
                src={avatarUrl}
                alt="Buggy"
                className="w-full h-full object-contain bg-[radial-gradient(circle_at_30%_20%,rgba(255,90,0,0.3),rgba(8,8,10,0.95)_65%)]"
                onError={(e) => { e.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL }}
            />
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent)]
                flex items-center justify-center text-[8px] font-mono text-white font-bold">
                /
            </div>
        </motion.button>
    )
}

/* ── Bottom Sheet ──────────────────────────────────────────── */

interface BuggyBottomSheetProps {
    open: boolean
    onClose: () => void
}

export function BuggyBottomSheet({ open, onClose }: BuggyBottomSheetProps) {
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

    const [processing, setProcessing] = useState(false)
    const [lastMessage, setLastMessage] = useState<string | null>(null)
    const [liveVoiceReply, setLiveVoiceReply] = useState<string | null>(null)
    const dragControls = useDragControls()

    /** Dispatch signal and return reply text for TTS */
    const dispatchSignal = useCallback(async (text: string, source: 'text' | 'voice' = 'text'): Promise<string | null> => {
        if (!text || !user || processing) return null

        setProcessing(true)
        setView({ kind: 'processing' })

        try {
            const result = await cortexBridgeService.routeSignal(text, source)

            if (!result) {
                showError(txt('Sem resposta do servidor', 'No server response'))
                setProcessing(false)
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
                if (source === 'text') onClose()
                return txt('Feito!', 'Done!')
            } else if (result.nextAction === 'query_openai_with_context') {
                try {
                    const chatReply = await cortexBridgeService.chat(text)
                    showReply(chatReply)
                    setLastMessage(txt('💬 Buggy respondeu', '💬 Buggy replied'))
                    if (source === 'text') onClose()
                    return chatReply
                } catch {
                    const fallback = txt('Estou aqui. O que precisas?', 'I\'m here. What do you need?')
                    showReply(fallback)
                    setLastMessage(txt('💬 Buggy respondeu', '💬 Buggy replied'))
                    if (source === 'text') onClose()
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
                if (source === 'text') onClose()
                return txt('Draft criado. Confirma os dados.', 'Draft created. Please confirm.')
            } else {
                showError(txt('Resposta inesperada', 'Unexpected response'))
                return null
            }
        } catch {
            showError(txt('❌ Erro na ligação', '❌ Connection error'))
            return null
        } finally {
            setProcessing(false)
        }
    }, [user, processing, txt, setView, showDraft, showSuccess, showError, showReply, onClose])

    /** Handle live voice transcript */
    const handleLiveVoiceTranscript = useCallback(async (transcript: string) => {
        const reply = await dispatchSignal(transcript, 'voice')
        if (reply) {
            setLiveVoiceReply(reply)
        }
    }, [dispatchSignal])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Scrim */}
                    <motion.div
                        className="fixed inset-0 z-[79] bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-[80] rounded-t-2xl overflow-hidden
                            bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]
                            shadow-[0_-8px_40px_rgba(0,0,0,0.4)]"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 300) onClose()
                        }}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                    >
                        {/* Drag handle */}
                        <div
                            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)]/30" />
                        </div>

                        {/* Header with avatar + status */}
                        <div className="flex items-center gap-3 px-5 pb-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--accent)]/30 shrink-0">
                                <img
                                    src={avatarUrl}
                                    alt={copilotName}
                                    className="w-full h-full object-contain bg-[radial-gradient(circle_at_30%_20%,rgba(255,90,0,0.2),rgba(8,8,10,0.95)_65%)]"
                                    onError={(e) => { e.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                    {copilotName}
                                    <div className={`w-1.5 h-1.5 rounded-full ${processing ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--success)]'}`} />
                                </div>
                                {lastMessage && (
                                    <div className="text-xs text-[var(--text-secondary)] truncate">{lastMessage}</div>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center
                                    text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                                    transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Premium Input */}
                        <div className="px-4 pb-4">
                            <PremiumInputBar
                                onSend={(text) => void dispatchSignal(text)}
                                onLiveVoiceTranscript={(t) => void handleLiveVoiceTranscript(t)}
                                liveVoiceReply={liveVoiceReply}
                                onLiveVoiceReplyDone={() => setLiveVoiceReply(null)}
                                processing={processing}
                                compact
                                autoFocus
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
