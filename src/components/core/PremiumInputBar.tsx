import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Plus, Mic, AudioLines, X, Image, FileText } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useLiveVoiceEngine } from '@/hooks/useLiveVoiceEngine'
import { speechService } from '@/services/speechService'
import { LiveVoiceVisualizer } from '@/components/ambient/LiveVoiceVisualizer'

/* ── Types ── */

export type InputMode = 'text' | 'dictation' | 'liveVoice'

export interface PremiumInputBarProps {
    /** Called when user sends a text message */
    onSend: (text: string) => void
    /** Called when user attaches a file */
    onAttach?: (file: File) => void
    /** Called when dictation produces a transcript */
    onTranscript?: (text: string) => void
    /** Called when live voice VAD produces a transcript — parent should dispatch to cortex */
    onLiveVoiceTranscript?: (text: string) => void
    /** Text that Buggy should speak aloud (set by parent after cortex reply) */
    liveVoiceReply?: string | null
    /** Called when live voice TTS finishes speaking */
    onLiveVoiceReplyDone?: () => void
    /** Whether the input is processing a request */
    processing?: boolean
    /** Placeholder text */
    placeholder?: string
    /** Compact mode (smaller heights, tighter spacing) */
    compact?: boolean
    /** Auto-focus the input */
    autoFocus?: boolean
    /** Additional class on the container */
    className?: string
}

/* ── Component ── */

export function PremiumInputBar({
    onSend,
    onAttach,
    onTranscript,
    onLiveVoiceTranscript,
    liveVoiceReply,
    onLiveVoiceReplyDone,
    processing = false,
    placeholder,
    compact = false,
    autoFocus = false,
    className,
}: PremiumInputBarProps) {
    const { txt } = useLocaleText()
    const [text, setText] = useState('')
    const [mode, setMode] = useState<InputMode>('text')
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const [dictationText, setDictationText] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Live voice engine — full two-way conversation loop
    const liveVoice = useLiveVoiceEngine({
        onTranscript: (transcript) => {
            onLiveVoiceTranscript?.(transcript)
        },
        onError: (msg) => {
            console.error('Live voice error:', msg)
            setMode('text')
        },
    })

    const defaultPlaceholder = txt('Diz algo ao Buggy…', 'Tell Buggy something…')

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, compact ? 80 : 120)}px`
    }, [text, compact])

    // When parent sets liveVoiceReply, trigger TTS
    useEffect(() => {
        if (liveVoiceReply && mode === 'liveVoice') {
            liveVoice.speakReply(liveVoiceReply).then(() => {
                onLiveVoiceReplyDone?.()
            }).catch(() => {
                onLiveVoiceReplyDone?.()
            })
        }
    }, [liveVoiceReply]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Send ── */
    const handleSend = useCallback(() => {
        const trimmed = text.trim()
        if (!trimmed || processing) return
        onSend(trimmed)
        setText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }, [text, processing, onSend])

    /* ── Dictation (Speech-to-text via speechService) ── */
    const startDictation = useCallback(async () => {
        if (!speechService.isMicAvailable()) return
        setMode('dictation')
        setDictationText('')
        await speechService.startRecording(
            () => { /* status updates handled by mode state */ },
            (transcript) => {
                setDictationText('')
                if (transcript) {
                    setText(prev => prev + (prev ? ' ' : '') + transcript)
                    onTranscript?.(transcript)
                }
                setMode('text')
                setTimeout(() => textareaRef.current?.focus(), 100)
            },
        )
    }, [onTranscript])

    const stopDictation = useCallback(async () => {
        await speechService.stopRecording()
    }, [])

    const cancelDictation = useCallback(() => {
        speechService.cancelRecording()
        setDictationText('')
        setMode('text')
    }, [])

    /* ── Live Voice (two-way conversation) ── */
    const startLiveVoice = useCallback(async () => {
        setMode('liveVoice')
        const ok = await liveVoice.start()
        if (!ok) setMode('text')
    }, [liveVoice])

    const stopLiveVoice = useCallback(() => {
        liveVoice.stop()
        setMode('text')
    }, [liveVoice])

    /* ── Attachment ── */
    const handleAttachClick = useCallback((accept: string) => {
        if (!fileInputRef.current) return
        fileInputRef.current.accept = accept
        fileInputRef.current.click()
        setShowAttachMenu(false)
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && onAttach) onAttach(file)
        e.target.value = ''
    }, [onAttach])

    /* ── Keyboard ── */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    const containerHeight = compact ? 'min-h-[48px]' : 'min-h-[52px]'
    const isLiveVoiceActive = mode === 'liveVoice' && liveVoice.phase !== 'idle'
    const isDictating = mode === 'dictation'

    return (
        <div className={`relative ${className ?? ''}`}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Attachment dropdown */}
            <AnimatePresence>
                {showAttachMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full left-0 mb-2 z-10
                            bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
                            rounded-xl shadow-[var(--shadow-lg)] overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => handleAttachClick('image/*')}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm
                                text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <Image size={15} className="text-[var(--accent)]" />
                            {txt('Imagem / Recibo', 'Image / Receipt')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAttachClick('.pdf,.doc,.docx,.txt,.csv')}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm
                                text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <FileText size={15} className="text-blue-400" />
                            {txt('Documento', 'Document')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main input container */}
            <div className={`flex items-end gap-1.5 px-2 py-1.5
                bg-[var(--bg-elevated)] border border-[var(--border-default)]
                rounded-2xl transition-colors focus-within:border-[var(--accent)]/60
                ${containerHeight}`}
            >
                {/* Left: Attachment button */}
                {!isLiveVoiceActive && !isDictating && (
                    <motion.button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        onBlur={() => setTimeout(() => setShowAttachMenu(false), 150)}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0
                            text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                            hover:bg-white/5 transition-all cursor-pointer"
                        whileTap={{ scale: 0.9 }}
                        aria-label={txt('Anexar ficheiro', 'Attach file')}
                    >
                        <Plus size={18} />
                    </motion.button>
                )}

                {/* Center: Text input OR Voice visualizer */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {isLiveVoiceActive ? (
                            <motion.div
                                key="waveform"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-1"
                            >
                                <LiveVoiceVisualizer
                                    analyserNode={liveVoice.activeAnalyser}
                                    active={true}
                                    phase={liveVoice.phase}
                                    onStop={stopLiveVoice}
                                    elapsed={liveVoice.elapsed}
                                    compact={compact}
                                />
                            </motion.div>
                        ) : isDictating ? (
                            <motion.div
                                key="dictation"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 py-2 px-1"
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                <span className="text-sm text-[var(--text-secondary)] truncate">
                                    {dictationText || txt('A ouvir…', 'Listening…')}
                                </span>
                                <button
                                    type="button"
                                    onClick={cancelDictation}
                                    className="ml-auto w-7 h-7 rounded-full flex items-center justify-center
                                        text-[var(--text-tertiary)] hover:text-red-400
                                        transition-colors cursor-pointer shrink-0"
                                >
                                    <X size={14} />
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={() => void stopDictation()}
                                    className="w-9 h-9 rounded-full flex items-center justify-center
                                        bg-[var(--accent)] text-white cursor-pointer shrink-0"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Send size={14} />
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <textarea
                                    ref={textareaRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholder ?? defaultPlaceholder}
                                    disabled={processing}
                                    autoFocus={autoFocus}
                                    rows={1}
                                    className="w-full bg-transparent border-0 outline-none resize-none
                                        text-sm text-[var(--text-primary)]
                                        placeholder:text-[var(--text-tertiary)]
                                        py-2 px-1 min-h-0 leading-[1.4]"
                                    style={{ maxHeight: compact ? 80 : 120 }}
                                    enterKeyHint="send"
                                    autoComplete="off"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Action buttons */}
                {!isLiveVoiceActive && !isDictating && (
                    <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
                        {text.trim() ? (
                            <motion.button
                                type="button"
                                onClick={handleSend}
                                disabled={processing}
                                className="w-9 h-9 rounded-full flex items-center justify-center
                                    bg-[var(--accent)] text-white cursor-pointer
                                    disabled:opacity-40 disabled:cursor-default
                                    transition-all hover:brightness-110"
                                whileTap={{ scale: 0.9 }}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                aria-label="Send"
                            >
                                {processing
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Send size={15} />
                                }
                            </motion.button>
                        ) : (
                            <>
                                {/* Dictation mic (speech-to-text) */}
                                <motion.button
                                    type="button"
                                    onClick={() => void startDictation()}
                                    disabled={processing || !speechService.isMicAvailable()}
                                    className="w-9 h-9 rounded-full flex items-center justify-center
                                        text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                                        hover:bg-white/5 transition-all cursor-pointer
                                        disabled:opacity-30 disabled:cursor-default"
                                    whileTap={{ scale: 0.9 }}
                                    title={txt('Ditado (voz para texto)', 'Dictation (speech to text)')}
                                    aria-label="Dictation"
                                >
                                    <Mic size={18} />
                                </motion.button>

                                {/* Live voice conversation */}
                                <motion.button
                                    type="button"
                                    onClick={() => void startLiveVoice()}
                                    disabled={processing || !speechService.isMicAvailable()}
                                    className="w-9 h-9 rounded-full flex items-center justify-center
                                        text-[var(--accent)]/70 hover:text-[var(--accent)]
                                        hover:bg-[var(--accent)]/8 transition-all cursor-pointer
                                        disabled:opacity-30 disabled:cursor-default"
                                    whileTap={{ scale: 0.9 }}
                                    title={txt('Conversa ao vivo', 'Live conversation')}
                                    aria-label="Live voice"
                                >
                                    <AudioLines size={18} />
                                </motion.button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
