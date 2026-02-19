import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Check, XCircle, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { copilotService, type CopilotMessage, type PendingConfirmation } from '@/services/copilotService'
import { speechService, type SpeechState } from '@/services/speechService'
import { ttsService } from '@/services/ttsService'

export function BuggyWidget() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<CopilotMessage[]>([])
    const [displayMessages, setDisplayMessages] = useState<{ role: string; content: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [pending, setPending] = useState<PendingConfirmation | null>(null)
    const [speech, setSpeech] = useState<SpeechState>({ status: 'idle', level: 0 })
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [displayMessages, isLoading])

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    const sendMessage = async () => {
        if (!input.trim() || isLoading || !user) return

        const userMsg = input.trim()
        setInput('')
        setDisplayMessages(prev => [...prev, { role: 'user', content: userMsg }])

        const updatedMessages: CopilotMessage[] = [...messages, { role: 'user', content: userMsg }]
        setMessages(updatedMessages)
        setIsLoading(true)

        const result = await copilotService.chat(updatedMessages, user.id)

        setMessages(result.updatedMessages)
        setDisplayMessages(prev => [...prev, { role: 'assistant', content: result.reply }])
        setPending(result.pendingConfirmation)
        setIsLoading(false)
    }

    const handleConfirm = async (confirmed: boolean) => {
        if (!pending || !user) return
        setPending(null)

        if (!confirmed) {
            setDisplayMessages(prev => [...prev, { role: 'assistant', content: '❌ Ação cancelada.' }])
            return
        }

        setIsLoading(true)
        const result = await copilotService.executeConfirmed(messages, pending, user.id)

        setMessages(result.updatedMessages)
        setDisplayMessages(prev => [...prev, { role: 'assistant', content: result.reply }])
        setIsLoading(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // ── TTS per-message ──
    const handleSpeak = useCallback(async (text: string, index: number) => {
        if (speakingIndex === index) {
            ttsService.stop()
            setSpeakingIndex(null)
            return
        }
        ttsService.stop()
        setSpeakingIndex(index)
        await ttsService.speak(text)
        setSpeakingIndex(null)
    }, [speakingIndex])

    // ── Voice Input ──
    const isRecording = speech.status === 'recording'
    const isTranscribing = speech.status === 'transcribing'

    const handleMic = useCallback(async () => {
        if (isRecording) {
            const text = await speechService.stopRecording()
            if (text) {
                setInput(text)
                // Auto-send after short delay so user sees the text
                setTimeout(() => {
                    setInput(prev => {
                        if (prev === text) {
                            // Trigger send
                            const fakeEvent = { trim: () => text } as unknown as string
                            void fakeEvent // just to trigger
                        }
                        return prev
                    })
                }, 300)
            }
        } else {
            await speechService.startRecording(setSpeech)
        }
    }, [isRecording])

    // Auto-send when transcription completes and input is set from voice
    const lastSpeechStatus = useRef(speech.status)
    useEffect(() => {
        if (lastSpeechStatus.current === 'transcribing' && speech.status === 'idle' && input.trim()) {
            sendMessage()
        }
        lastSpeechStatus.current = speech.status
    }, [speech.status])

    return (
        <>
            {/* Floating trigger — Mascot */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-[72px] h-[72px] rounded-full shadow-2xl flex items-center justify-center cursor-pointer overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, var(--color-accent), #f59e0b)',
                    border: '2px solid rgba(255,255,255,0.2)',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                {isOpen ? (
                    <X size={22} className="text-white" />
                ) : (
                    <img src="/buggy-mascot.png" alt="Buggy" className="w-[60px] h-[60px] object-contain object-bottom" />
                )}
            </motion.button>

            {/* Chat panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[70vh] rounded-[var(--radius-xl)] overflow-hidden shadow-2xl flex flex-col"
                        style={{
                            background: 'var(--color-bg-primary)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        {/* Header with mascot */}
                        <div className="relative h-28 overflow-hidden flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, var(--color-accent), #f59e0b)' }}>
                            <img
                                src="/buggy-mascot.png"
                                alt="Buggy"
                                className="absolute right-2 bottom-0 h-28 object-contain opacity-30 pointer-events-none"
                            />
                            <div className="relative z-10 p-4 pt-3">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    🐛 Buggy
                                </h3>
                                <p className="text-white/70 text-[11px]">
                                    Copilot do Feed Center — pergunta-me qualquer coisa
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[200px] max-h-[calc(70vh-180px)]">
                            {displayMessages.length === 0 && !isLoading && (
                                <div className="text-center py-8 opacity-40">
                                    <p className="text-sm">Olá! 👋</p>
                                    <p className="text-xs mt-1">Experimenta:</p>
                                    <div className="mt-3 space-y-1.5">
                                        {['Qual é o meu saldo?', 'Cria um todo: comprar leite', 'Quantos tokens tenho?'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setInput(s); inputRef.current?.focus() }}
                                                className="block w-full text-xs py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {displayMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`group relative max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                                        : 'bg-white/5 border border-white/5 rounded-bl-md'
                                        }`}>
                                        {msg.content.split('\n').map((line, j) => (
                                            <p key={j} className={j > 0 ? 'mt-1' : ''}>
                                                {line.startsWith('**') && line.endsWith('**')
                                                    ? <strong>{line.slice(2, -2)}</strong>
                                                    : line}
                                            </p>
                                        ))}
                                        {/* TTS button — only on assistant messages */}
                                        {msg.role === 'assistant' && ttsService.isAvailable() && (
                                            <button
                                                onClick={() => handleSpeak(msg.content, i)}
                                                title={speakingIndex === i ? 'Parar' : 'Ouvir resposta'}
                                                className={`absolute -bottom-3 right-1 opacity-0 group-hover:opacity-100 transition-all duration-150
                                                    w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                                                    ${speakingIndex === i
                                                        ? 'opacity-100 bg-[var(--color-accent)] text-white'
                                                        : 'bg-white/10 hover:bg-[var(--color-accent)] text-white/60 hover:text-white'
                                                    }`}
                                            >
                                                {speakingIndex === i
                                                    ? <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                                                        <VolumeX size={11} />
                                                    </motion.span>
                                                    : <Volume2 size={11} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-2 text-xs opacity-50">
                                            <Loader2 size={12} className="animate-spin" />
                                            A processar...
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Confirmation dialog */}
                            {pending && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs font-bold text-amber-400 mb-2">⚠️ Confirmação necessária</p>
                                    <p className="text-xs opacity-60 mb-3">{pending.description}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleConfirm(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer"
                                        >
                                            <Check size={12} /> Confirmar
                                        </button>
                                        <button
                                            onClick={() => handleConfirm(false)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                                        >
                                            <XCircle size={12} /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/5 flex-shrink-0">
                            {/* Recording indicator */}
                            <AnimatePresence>
                                {isRecording && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-2 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <motion.div
                                                className="w-2.5 h-2.5 rounded-full bg-red-500"
                                                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                            />
                                            <span className="text-xs text-red-400 font-medium">A gravar...</span>
                                            {/* Audio level bar */}
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-red-400 rounded-full"
                                                    animate={{ width: `${Math.max(5, speech.level * 100)}%` }}
                                                    transition={{ duration: 0.1 }}
                                                />
                                            </div>
                                            <span className="text-[10px] opacity-40">auto-stop</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isTranscribing && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <Loader2 size={12} className="animate-spin text-amber-400" />
                                    <span className="text-xs text-amber-400">A transcrever com Whisper...</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {/* Mic button */}
                                <button
                                    onClick={handleMic}
                                    disabled={isLoading || isTranscribing}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 flex-shrink-0 ${isRecording
                                        ? 'bg-red-500 animate-pulse'
                                        : 'bg-white/5 hover:bg-white/10'
                                        }`}
                                    title={isRecording ? 'Parar gravação' : 'Gravar voz'}
                                >
                                    {isRecording
                                        ? <MicOff size={14} className="text-white" />
                                        : <Mic size={14} className="opacity-60" />
                                    }
                                </button>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isRecording ? 'A ouvir...' : 'Fala com o Buggy...'}
                                    disabled={isLoading || isRecording}
                                    className="flex-1 bg-white/5 border border-white/5 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]/50 transition-colors"
                                    style={{ color: 'var(--color-text-primary)' }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !input.trim() || isRecording}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                                    style={{ background: 'var(--color-accent)' }}
                                >
                                    <Send size={14} className="text-white" />
                                </button>
                            </div>
                            {!copilotService.isAvailable() && (
                                <p className="text-[10px] text-red-400/60 mt-1 text-center">⚠️ API key não configurada</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
