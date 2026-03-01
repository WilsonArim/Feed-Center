import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, X } from 'lucide-react'
import { useSymbioteStore } from '@/stores/symbioteStore'
import { useAuth } from '@/components/core/AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'
import { cortexBridgeService } from '@/services/cortexBridgeService'
import { useCopilotAvatarUrl } from '@/hooks/useUserSettings'
import { DEFAULT_COPILOT_AVATAR_URL } from '@/services/userSettingsService'

export function CognitiveInputBar() {
    const { txt } = useLocaleText()
    const { user } = useAuth()
    const openSymbiote = useSymbioteStore((s) => s.open)
    const symbioteOpen = useSymbioteStore((s) => s.isOpen)
    const copilotAvatarQuery = useCopilotAvatarUrl()
    const avatarUrl = copilotAvatarQuery.data ?? DEFAULT_COPILOT_AVATAR_URL

    const [expanded, setExpanded] = useState(false)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const feedbackTimeout = useRef<number | null>(null)

    // Auto-focus on expand
    useEffect(() => {
        if (expanded) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [expanded])

    // Close when symbiote opens
    useEffect(() => {
        if (symbioteOpen) setExpanded(false)
    }, [symbioteOpen])

    // Keyboard shortcut: / to expand
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const target = e.target as HTMLElement
                const tag = target.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
                e.preventDefault()
                setExpanded(true)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    const showFeedback = useCallback((msg: string) => {
        if (feedbackTimeout.current) window.clearTimeout(feedbackTimeout.current)
        setFeedback(msg)
        feedbackTimeout.current = window.setTimeout(() => {
            setFeedback(null)
            feedbackTimeout.current = null
        }, 2500)
    }, [])

    const dispatchText = useCallback(async () => {
        const text = input.trim()
        if (!text || !user || sending) return
        setInput('')
        setSending(true)

        try {
            const result = await cortexBridgeService.routeSignal(text, 'text')

            const isAutoCommitted = result?.reason?.some((r: string) => r.includes('auto_commit=true'))
            if (isAutoCommitted) {
                showFeedback(txt('✅ Auto-executado', '✅ Auto-committed'))
            } else if (result?.strategy === 'tactical_reflex') {
                showFeedback(txt('💡 Draft criado', '💡 Draft created'))
            } else {
                showFeedback(txt('📡 Sinal processado', '📡 Signal processed'))
            }
        } catch {
            showFeedback(txt('❌ Erro na ligação', '❌ Connection error'))
        } finally {
            setSending(false)
        }
    }, [input, user, sending, showFeedback, txt])

    // Hide when symbiote is open
    if (symbioteOpen) return null

    return (
        <div className="fixed bottom-6 right-6 z-[89] flex items-end gap-3">
            <AnimatePresence>
                {/* Feedback toast */}
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute bottom-20 right-0 whitespace-nowrap px-4 py-2
                            bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
                            rounded-lg shadow-[var(--shadow-lg)] text-xs font-medium
                            text-[var(--text-primary)]"
                    >
                        {feedback}
                    </motion.div>
                )}

                {/* Expanded input bar */}
                {expanded && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="flex items-center gap-2 h-14 px-4
                            bg-[var(--glass-bg)] backdrop-blur-2xl
                            border border-[var(--border-subtle)]
                            rounded-full shadow-[var(--shadow-lg)] overflow-hidden"
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void dispatchText()
                                }
                                if (e.key === 'Escape') {
                                    setExpanded(false)
                                    setInput('')
                                }
                            }}
                            placeholder={txt('Diz algo ao Buggy...', 'Tell Buggy something...')}
                            disabled={sending}
                            className="flex-1 bg-transparent border-0 outline-none
                                text-sm text-[var(--text-primary)]
                                placeholder:text-[var(--text-tertiary)]"
                        />

                        {input.trim() && (
                            <button
                                onClick={() => void dispatchText()}
                                disabled={sending}
                                className="flex items-center justify-center w-8 h-8 rounded-full
                                    bg-[var(--accent)] text-white hover:brightness-110
                                    transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Send size={14} />
                            </button>
                        )}

                        <button
                            onClick={() => { setExpanded(false); setInput('') }}
                            className="flex items-center justify-center w-6 h-6
                                text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                                transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mic button → opens full Symbiote */}
            {expanded && (
                <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={openSymbiote}
                    className="w-12 h-12 rounded-full flex items-center justify-center
                        bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                        text-[var(--text-secondary)] hover:text-[var(--accent)]
                        hover:border-[var(--accent)]/50 transition-all cursor-pointer
                        shadow-[var(--shadow-md)]"
                    title={txt('Modo voz', 'Voice mode')}
                >
                    <Mic size={18} />
                </motion.button>
            )}

            {/* Avatar FAB (click to expand, or long-press/right-click for voice) */}
            <motion.button
                type="button"
                onClick={() => setExpanded(!expanded)}
                onContextMenu={(e) => { e.preventDefault(); openSymbiote() }}
                className="w-16 h-16 rounded-full overflow-hidden border border-[var(--accent)]/45
                    shadow-[0_0_50px_rgba(255,90,0,0.35)] cursor-pointer"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                aria-label={expanded
                    ? txt('Fechar input', 'Close input')
                    : txt('Invocar Buggy', 'Invoke Buggy')
                }
            >
                <img
                    src={avatarUrl}
                    alt="Buggy"
                    className="w-full h-full object-contain bg-[radial-gradient(circle_at_30%_20%,rgba(255,90,0,0.35),rgba(8,8,10,0.95)_65%)]"
                    onError={(e) => { e.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL }}
                />

                {/* Slash hint when collapsed */}
                {!expanded && (
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[var(--bg-elevated)]
                        border border-[var(--border-subtle)] flex items-center justify-center
                        text-[9px] font-mono text-[var(--text-tertiary)]"
                    >
                        /
                    </div>
                )}
            </motion.button>
        </div>
    )
}
