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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [displayMessages, isLoading])

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
            setDisplayMessages(prev => [...prev, { role: 'assistant', content: 'Acao cancelada.' }])
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

    const isRecording = speech.status === 'recording'
    const isTranscribing = speech.status === 'transcribing'

    const handleMic = useCallback(async () => {
        if (isRecording) {
            const text = await speechService.stopRecording()
            if (text) {
                setInput(text)
                setTimeout(() => {
                    setInput(prev => {
                        if (prev === text) {
                            const fakeEvent = { trim: () => text } as unknown as string
                            void fakeEvent
                        }
                        return prev
                    })
                }, 300)
            }
        } else {
            await speechService.startRecording(setSpeech)
        }
    }, [isRecording])

    const lastSpeechStatus = useRef(speech.status)
    useEffect(() => {
        if (lastSpeechStatus.current === 'transcribing' && speech.status === 'idle' && input.trim()) {
            sendMessage()
        }
        lastSpeechStatus.current = speech.status
    }, [speech.status])

    return (
        <>
            {/* Floating trigger */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden
                    bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)]
                    shadow-[0_8px_32px_var(--color-accent)/30] hover:shadow-[0_8px_40px_var(--color-accent)/40]
                    transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                {isOpen ? (
                    <X size={20} className="text-white" />
                ) : (
                    <img src="/buggy-mascot.png" alt="Buggy" className="w-10 h-10 object-contain object-bottom" />
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
                        className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[70vh] rounded-2xl overflow-hidden flex flex-col
                            bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                            shadow-[0_24px_80px_-12px_rgba(0,0,0,0.3)]"
                    >
                        {/* Header */}
                        <div className="relative h-20 overflow-hidden flex-shrink-0 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)]">
                            <img
                                src="/buggy-mascot.png"
                                alt=""
                                className="absolute right-2 bottom-0 h-20 object-contain opacity-20 pointer-events-none"
                            />
                            <div className="relative z-10 p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <img src="/buggy-mascot.png" alt="Buggy" className="w-7 h-7 object-contain" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">Buggy</h3>
                                    <p className="text-white/60 text-[11px]">Copilot do Feed Center</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[200px] max-h-[calc(70vh-180px)]">
                            {displayMessages.length === 0 && !isLoading && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-[var(--color-text-secondary)]">Ola!</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Experimenta:</p>
                                    <div className="mt-3 space-y-1.5">
                                        {['Qual e o meu saldo?', 'Cria um todo: comprar leite', 'Quantos tokens tenho?'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setInput(s); inputRef.current?.focus() }}
                                                className="block w-full text-xs py-2 px-3 rounded-xl
                                                    bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-accent)]/10
                                                    text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]
                                                    transition-colors text-left cursor-pointer border border-[var(--color-border)]"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {displayMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`group relative max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                                            : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-md'
                                    }`}>
                                        {msg.content.split('\n').map((line, j) => (
                                            <p key={j} className={j > 0 ? 'mt-1' : ''}>
                                                {line.startsWith('**') && line.endsWith('**')
                                                    ? <strong>{line.slice(2, -2)}</strong>
                                                    : line}
                                            </p>
                                        ))}
                                        {msg.role === 'assistant' && ttsService.isAvailable() && (
                                            <button
                                                onClick={() => handleSpeak(msg.content, i)}
                                                title={speakingIndex === i ? 'Parar' : 'Ouvir resposta'}
                                                className={`absolute -bottom-3 right-1 opacity-0 group-hover:opacity-100 transition-all duration-150
                                                    w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                                                    ${speakingIndex === i
                                                        ? 'opacity-100 bg-[var(--color-accent)] text-white'
                                                        : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:bg-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-white'
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

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                            <Loader2 size={12} className="animate-spin" />
                                            A processar...
                                        </div>
                                    </div>
                                </div>
                            )}

                            {pending && (
                                <div className="p-3 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
                                    <p className="text-xs font-bold text-[var(--color-warning)] mb-2">Confirmacao necessaria</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mb-3">{pending.description}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleConfirm(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25 transition-colors cursor-pointer"
                                        >
                                            <Check size={12} /> Confirmar
                                        </button>
                                        <button
                                            onClick={() => handleConfirm(false)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 transition-colors cursor-pointer"
                                        >
                                            <XCircle size={12} /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-secondary)]">
                            <AnimatePresence>
                                {isRecording && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-2 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                                            <motion.div
                                                className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)]"
                                                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                            />
                                            <span className="text-xs text-[var(--color-danger)] font-medium">A gravar...</span>
                                            <div className="flex-1 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-[var(--color-danger)] rounded-full"
                                                    animate={{ width: `${Math.max(5, speech.level * 100)}%` }}
                                                    transition={{ duration: 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isTranscribing && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
                                    <Loader2 size={12} className="animate-spin text-[var(--color-warning)]" />
                                    <span className="text-xs text-[var(--color-warning)]">A transcrever...</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleMic}
                                    disabled={isLoading || isTranscribing}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 flex-shrink-0 ${
                                        isRecording
                                            ? 'bg-[var(--color-danger)] animate-pulse text-white'
                                            : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-accent)]/10 text-[var(--color-text-muted)]'
                                    }`}
                                    title={isRecording ? 'Parar gravacao' : 'Gravar voz'}
                                >
                                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                </button>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isRecording ? 'A ouvir...' : 'Fala com o Buggy...'}
                                    disabled={isLoading || isRecording}
                                    className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm outline-none
                                        focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/10 transition-all
                                        text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !input.trim() || isRecording}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-30
                                        bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                            {!copilotService.isAvailable() && (
                                <p className="text-[10px] text-[var(--color-danger)] opacity-60 mt-1.5 text-center">API key nao configurada</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
