import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Mic, MicOff, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/components/core/AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useCopilotAvatarUrl, useCopilotName } from '@/hooks/useUserSettings'
import { DEFAULT_COPILOT_AVATAR_URL } from '@/services/userSettingsService'
import { copilotService, type CopilotMessage, type PendingConfirmation } from '@/services/copilotService'
import { useSymbioteStore } from '@/stores/symbioteStore'
import { AudioKineticAvatar } from '@/components/ambient/AudioKineticAvatar'
import { useSymbioteAudio } from '@/hooks/useSymbioteAudio'
import { cortexBridgeService, type CortexModuleReflexDetail } from '@/services/cortexBridgeService'
import { SYMBIOTE_TTS_REQUEST_EVENT, type TtsRequestDetail } from '@/services/ttsService'



export function HolographicSymbiote() {
    const { txt } = useLocaleText()
    const { user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const copilotNameQuery = useCopilotName()
    const copilotAvatarQuery = useCopilotAvatarUrl()
    const copilotName = copilotNameQuery.data ?? 'Buggy'
    const copilotAvatarUrl = copilotAvatarQuery.data ?? DEFAULT_COPILOT_AVATAR_URL

    const isOpen = useSymbioteStore((state) => state.isOpen)
    const micEnabled = useSymbioteStore((state) => state.micEnabled)
    const open = useSymbioteStore((state) => state.open)
    const close = useSymbioteStore((state) => state.close)
    const setMicEnabled = useSymbioteStore((state) => state.setMicEnabled)
    const clearFocusedElementId = useSymbioteStore((state) => state.clearFocusedElementId)

    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState<CopilotMessage[]>([])
    const [pending, setPending] = useState<PendingConfirmation | null>(null)
    const [statusLine, setStatusLine] = useState<string>('')
    const [bridgeFault, setBridgeFault] = useState(false)
    const messagesRef = useRef<CopilotMessage[]>([])
    const bridgeFaultTimeoutRef = useRef<number | null>(null)
    const dispatchSignalRef = useRef<(signalText: string, source: 'text' | 'voice') => Promise<void>>(
        async () => undefined
    )

    const handleTranscriptReady = useCallback((transcript: string) => {
        const signal = transcript.trim()
        if (!signal) return
        setInput('')
        void dispatchSignalRef.current(signal, 'voice')
    }, [])

    const {
        isRecording,
        isTranscribing,
        isSpeaking,
        visualLevel,
        isAvailable: isAudioAvailable,
        startListening,
        stopListening,
        cancelListening,
        speak,
        stopSpeaking,
    } = useSymbioteAudio({
        onTranscript: handleTranscriptReady,
    })

    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, close])

    useEffect(() => {
        if (isOpen) return
        cancelListening()
        clearFocusedElementId()
    }, [cancelListening, clearFocusedElementId, isOpen])

    useEffect(() => {
        if (micEnabled) return
        cancelListening()
    }, [micEnabled, cancelListening])

    useEffect(() => {
        if (isRecording) {
            setStatusLine(txt('A escutar sinal vocal...', 'Listening for voice signal...'))
            return
        }
        if (isTranscribing) {
            setStatusLine(txt('A transcrever intenção...', 'Transcribing intent...'))
            return
        }
        if (!isLoading && !pending) {
            setStatusLine(txt('Sistema em escuta.', 'System listening.'))
        }
    }, [isRecording, isTranscribing, isLoading, pending, txt])

    const canSend = useMemo(() => {
        return Boolean(user && input.trim() && !isLoading && !isRecording && !isTranscribing)
    }, [user, input, isLoading, isRecording, isTranscribing])

    const buildFinanceReflexSpeech = useCallback((detail: CortexModuleReflexDetail): string => {
        const draft = detail.financeDraft
        if (!draft) {
            return txt(
                'Reflexo tático financeiro injetado no ledger para confirmação.',
                'Financial tactical reflex injected into the ledger for confirmation.'
            )
        }

        const amountText = typeof draft.amount === 'number'
            ? `${draft.amount.toFixed(2)} ${draft.currency ?? 'EUR'}`
            : txt('valor por confirmar', 'amount pending confirmation')
        const merchant = draft.merchant?.trim() || txt('comerciante por confirmar', 'merchant pending confirmation')
        return txt(
            `Reflexo tático concluído. Despesa de ${amountText} em ${merchant} injetada no ledger para confirmação.`,
            `Tactical reflex complete. Expense of ${amountText} at ${merchant} injected into the ledger for confirmation.`
        )
    }, [txt])

    const buildModuleReflexSpeech = useCallback((detail: CortexModuleReflexDetail): string => {
        if (detail.route === 'FinanceModule') {
            return buildFinanceReflexSpeech(detail)
        }

        if (detail.route === 'TodoModule') {
            return txt(
                'Reflexo tático de tarefas executado. A ação foi enviada para o Inbox.',
                'Task tactical reflex executed. Action sent to Inbox.'
            )
        }

        if (detail.route === 'LinksModule') {
            return txt(
                'Reflexo tático de links executado. Ação enviada para o módulo de links.',
                'Links tactical reflex executed. Action sent to the links module.'
            )
        }

        return txt(
            'Reflexo tático de cripto executado. Ação enviada para o módulo cripto.',
            'Crypto tactical reflex executed. Action sent to the crypto module.'
        )
    }, [buildFinanceReflexSpeech, txt])

    const moduleLabel = useCallback((route: CortexModuleReflexDetail['route']) => {
        if (route === 'FinanceModule') return txt('Financeiro', 'Finance')
        if (route === 'TodoModule') return txt('Tarefas', 'Todo')
        if (route === 'LinksModule') return txt('Links', 'Links')
        return txt('Cripto', 'Crypto')
    }, [txt])



    const handleCortexRouteFailure = useCallback((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error)
        console.log('[HolographicSymbiote] Cortex route network error:', error)
        console.error('[HolographicSymbiote] Cortex route dispatch failed', error)
        if (bridgeFaultTimeoutRef.current !== null) {
            window.clearTimeout(bridgeFaultTimeoutRef.current)
        }
        setBridgeFault(true)
        bridgeFaultTimeoutRef.current = window.setTimeout(() => {
            setBridgeFault(false)
            bridgeFaultTimeoutRef.current = null
        }, 2400)
        setStatusLine(txt(
            `Erro na ligação sináptica: ${reason}`,
            `Synaptic bridge connection error: ${reason}`
        ))
        void speak(txt(
            'Erro na ligação sináptica. A tentar rota de contingência.',
            'Synaptic link error. Trying contingency route.'
        ))
    }, [speak, txt])

    const dispatchModuleReflex = useCallback(async (detail: CortexModuleReflexDetail) => {
        const onModuleRoute = cortexBridgeService.isModuleRouteActive(detail.route, location.pathname)

        if (onModuleRoute) {
            cortexBridgeService.emitModuleReflex(detail)
            return
        }

        const targetPath = cortexBridgeService.getModulePath(detail.route)
        cortexBridgeService.stageModuleReflex(detail)
        const readyPromise = cortexBridgeService.waitForModuleReady(detail.route)
        navigate(targetPath)
        const mounted = await readyPromise

        if (mounted) {
            cortexBridgeService.flushStagedModuleReflexes(detail.route)
            return
        }

        console.warn(`[HolographicSymbiote] ${detail.route} mount timeout. Reflex kept staged for delivery.`)
    }, [location.pathname, navigate])

    const dispatchSignal = useCallback(async (signalText: string, source: 'text' | 'voice') => {
        if (!user) return
        const signal = signalText.trim()
        if (!signal) return

        setIsLoading(true)
        setPending(null)
        setStatusLine(source === 'voice'
            ? txt('Sinal vocal recebido. A processar...', 'Voice signal received. Processing...')
            : txt('Sinal em processamento...', 'Signal processing...')
        )

        let cortexDecision: Awaited<ReturnType<typeof cortexBridgeService.routeSignal>> | null = null

        try {
            cortexDecision = await cortexBridgeService.routeSignal(signal, source)
        } catch (error) {
            handleCortexRouteFailure(error)
        }

        try {
            if (cortexDecision?.strategy === 'tactical_reflex') {
                const reflexDetail = cortexBridgeService.buildModuleReflex(cortexDecision, signal, source)
                if (reflexDetail) {
                    await dispatchModuleReflex(reflexDetail)
                }

                const reflexSpeech = reflexDetail
                    ? buildModuleReflexSpeech(reflexDetail)
                    : txt('Reflexo tático executado.', 'Tactical reflex executed.')
                void speak(reflexSpeech)

                const routedLabel = reflexDetail ? moduleLabel(reflexDetail.route) : txt('módulo alvo', 'target module')
                setStatusLine(txt(
                    `Reflexo tático despachado para ${routedLabel}.`,
                    `Tactical reflex dispatched to ${routedLabel}.`
                ))
                close()
                return
            }

            const baseMessages = messagesRef.current
            const updatedMessages: CopilotMessage[] = [...baseMessages, { role: 'user', content: signal }]
            setMessages(updatedMessages)
            messagesRef.current = updatedMessages

            const result = await copilotService.chat(updatedMessages, user.id)
            setMessages(result.updatedMessages)
            messagesRef.current = result.updatedMessages
            setPending(result.pendingConfirmation)

            if (result.reply.trim()) {
                void speak(result.reply)
            }

            if (result.pendingConfirmation) {
                setStatusLine(txt('Handshake tático requerido.', 'Tactical handshake required.'))
            } else {
                setStatusLine(txt('Sinal executado no sistema.', 'Signal executed in system.'))
            }
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            console.error('[HolographicSymbiote] Signal dispatch failed', error)
            setStatusLine(txt(
                `Falha na execução do sinal${reason ? `: ${reason}` : ''}`,
                `Signal execution failed${reason ? `: ${reason}` : ''}`
            ))
        } finally {
            setIsLoading(false)
        }
    }, [
        buildModuleReflexSpeech,
        close,
        dispatchModuleReflex,
        handleCortexRouteFailure,
        moduleLabel,
        speak,
        txt,
        user,
    ])

    useEffect(() => {
        dispatchSignalRef.current = dispatchSignal
    }, [dispatchSignal])

    useEffect(() => {
        return () => {
            if (bridgeFaultTimeoutRef.current !== null) {
                window.clearTimeout(bridgeFaultTimeoutRef.current)
                bridgeFaultTimeoutRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        const handleExternalSpeak = (event: Event) => {
            const customEvent = event as CustomEvent<TtsRequestDetail>
            const text = customEvent.detail?.text?.trim()
            if (!text) return

            const forceOpen = customEvent.detail?.forceOpen === true
            if (!isOpen && !forceOpen) return
            if (!isOpen && forceOpen) open()

            void speak(text)
        }

        window.addEventListener(SYMBIOTE_TTS_REQUEST_EVENT, handleExternalSpeak as EventListener)
        return () => {
            window.removeEventListener(SYMBIOTE_TTS_REQUEST_EVENT, handleExternalSpeak as EventListener)
        }
    }, [isOpen, open, speak])

    const resolveHandshake = async (approved: boolean) => {
        if (!pending || !user) return
        const currentPending = pending
        setPending(null)

        if (!approved) {
            setStatusLine(txt('Handshake rejeitado.', 'Handshake rejected.'))
            return
        }

        setIsLoading(true)
        setStatusLine(txt('A consolidar ação...', 'Consolidating action...'))
        try {
            const result = await copilotService.executeConfirmed(messagesRef.current, currentPending, user.id)
            setMessages(result.updatedMessages)
            messagesRef.current = result.updatedMessages
            if (result.reply.trim()) {
                void speak(result.reply)
            }
            setStatusLine(txt('Ação confirmada e aplicada.', 'Action confirmed and applied.'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleVoiceCapture = async () => {
        if (!micEnabled || isLoading) return

        if (!isRecording) {
            await startListening()
            return
        }

        const transcript = await stopListening()
        if (!transcript?.trim()) {
            setStatusLine(txt('Sem transcrição útil. Tenta novamente.', 'No usable transcription. Try again.'))
        }
    }

    const avatarStateLabel = useMemo(() => {
        if (bridgeFault) return 'synaptic fault'
        if (isSpeaking) return 'voice active'
        if (isTranscribing) return 'whisper decode'
        if (isRecording) return 'mic live'
        if (!micEnabled) return 'audio muted'
        return 'ambient listen'
    }, [bridgeFault, isSpeaking, isTranscribing, isRecording, micEnabled])

    return (
        <>
            {/* FAB is now in CognitiveInputBar — this overlay is opened programmatically */}

            <AnimatePresence>
                {isOpen && (
                    <motion.section
                        key="holographic-symbiote"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="fixed inset-0 z-[85] bg-black/84"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,90,0,0.20),rgba(0,0,0,0.96)_58%)] pointer-events-none" />

                        <button
                            type="button"
                            onClick={close}
                            className="absolute top-7 right-7 z-[95] text-white/45 hover:text-white transition-colors cursor-pointer"
                            aria-label={txt('Fechar', 'Close')}
                        >
                            <X size={22} />
                        </button>

                        <button
                            type="button"
                            onClick={handleVoiceCapture}
                            disabled={!micEnabled || !isAudioAvailable || isLoading || isTranscribing}
                            className="absolute top-7 left-7 z-[95] inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]
                                text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                            {isRecording
                                ? txt('Parar captura', 'Stop capture')
                                : txt('Capturar voz', 'Capture voice')
                            }
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (micEnabled && isRecording) cancelListening()
                                setMicEnabled(!micEnabled)
                            }}
                            className="absolute top-7 left-48 z-[95] inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]
                                text-white/45 hover:text-white transition-colors cursor-pointer"
                        >
                            {micEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            {micEnabled ? txt('Mic ativo', 'Mic active') : txt('Mic mutado', 'Mic muted')}
                        </button>

                        <button
                            type="button"
                            onClick={stopSpeaking}
                            className="absolute top-7 right-16 z-[95] text-white/45 hover:text-white transition-colors cursor-pointer"
                            aria-label={txt('Parar voz', 'Stop voice')}
                        >
                            <VolumeX size={18} />
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <AudioKineticAvatar
                                active={isOpen}
                                level={visualLevel}
                                errorPulse={bridgeFault}
                                avatarUrl={copilotAvatarUrl}
                                name={copilotName}
                                stateLabel={avatarStateLabel}
                            />
                        </div>

                        <div className="absolute inset-x-0 bottom-[18vh] px-8 md:px-16 z-[95]">
                            <div className="max-w-6xl mx-auto space-y-6">
                                <div className="h-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/42">
                                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                                    {!isLoading && <Sparkles size={14} />}
                                    <span>{statusLine || txt('Sistema em escuta.', 'System listening.')}</span>
                                </div>

                                <input
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault()
                                            if (!canSend) return
                                            const textSignal = input.trim()
                                            setInput('')
                                            void dispatchSignal(textSignal, 'text')
                                        }
                                    }}
                                    className="w-full bg-transparent border-0 p-0 m-0 outline-none
                                        text-5xl md:text-6xl lg:text-7xl font-black tracking-tight
                                        text-white/94 caret-[var(--accent)]"
                                    autoFocus
                                    spellCheck={false}
                                    disabled={isRecording || isTranscribing}
                                />

                                {pending && (
                                    <div className="flex items-center gap-6 text-sm md:text-base uppercase tracking-[0.22em]">
                                        <button
                                            type="button"
                                            onClick={() => { void resolveHandshake(true) }}
                                            className="text-[var(--accent)] hover:text-white transition-colors cursor-pointer"
                                        >
                                            {txt('Executar Handshake', 'Execute Handshake')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { void resolveHandshake(false) }}
                                            className="text-white/55 hover:text-white transition-colors cursor-pointer"
                                        >
                                            {txt('Rejeitar', 'Reject')}
                                        </button>
                                    </div>
                                )}

                                {!pending && (
                                    <div className="text-xs uppercase tracking-[0.24em] text-white/30">
                                        {cortexBridgeService.isAvailable() && isAudioAvailable
                                            ? txt('Enter para texto ou usa captura vocal.', 'Press Enter for text or use voice capture.')
                                            : txt('Bridge Cortex/OpenAI áudio indisponível.', 'Cortex bridge/OpenAI audio unavailable.')
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </>
    )
}
