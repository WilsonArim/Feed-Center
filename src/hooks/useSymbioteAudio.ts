import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { speechService, type SpeechState } from '@/services/speechService'

const OPENAI_TTS_API = 'https://api.openai.com/v1/audio/speech'
const TTS_CACHE_LIMIT = 20

export type SymbioteVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

interface UseSymbioteAudioOptions {
    onTranscript?: (text: string) => void
    voice?: SymbioteVoice
}

interface UseSymbioteAudioResult {
    speechState: SpeechState
    isRecording: boolean
    isTranscribing: boolean
    isSpeaking: boolean
    micLevel: number
    ttsLevel: number
    visualLevel: number
    isAvailable: boolean
    ttsAnalyser: AnalyserNode | null
    startListening: () => Promise<void>
    stopListening: () => Promise<string | null>
    cancelListening: () => void
    speak: (text: string, onEnd?: () => void) => Promise<void>
    stopSpeaking: () => void
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function sanitizeTtsText(value: string): string {
    return value
        .replace(/[*_~`#]/g, '')
        .replace(/\p{Emoji_Presentation}/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export function useSymbioteAudio(options?: UseSymbioteAudioOptions): UseSymbioteAudioResult {
    const voice = options?.voice ?? 'onyx'
    const onTranscript = options?.onTranscript
    const [speechState, setSpeechState] = useState<SpeechState>({ status: 'idle', level: 0 })
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [ttsLevel, setTtsLevel] = useState(0)

    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
    const audioElRef = useRef<HTMLAudioElement | null>(null)
    const rafIdRef = useRef<number | null>(null)
    const objectUrlRef = useRef<string | null>(null)
    const ttsCacheRef = useRef<Map<string, Blob>>(new Map())

    const stopSpeaking = useCallback(() => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }

        if (audioElRef.current) {
            audioElRef.current.pause()
            audioElRef.current.src = ''
            audioElRef.current.load()
            audioElRef.current = null
        }

        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect()
            sourceNodeRef.current = null
        }

        if (analyserRef.current) {
            analyserRef.current.disconnect()
            analyserRef.current = null
        }

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
        }

        setIsSpeaking(false)
        setTtsLevel(0)
    }, [])

    const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
        const ContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!ContextCtor) return null

        if (!audioContextRef.current) {
            audioContextRef.current = new ContextCtor()
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume()
        }

        return audioContextRef.current
    }, [])

    const monitorTtsAnalyser = useCallback((analyser: AnalyserNode) => {
        const frequency = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
            analyser.getByteFrequencyData(frequency)

            let weighted = 0
            let totalWeight = 0
            for (let i = 0; i < frequency.length; i++) {
                const normalized = (frequency[i] ?? 0) / 255
                const weight = i < frequency.length * 0.45 ? 1.3 : 0.65
                weighted += normalized * weight
                totalWeight += weight
            }

            const avg = totalWeight > 0 ? weighted / totalWeight : 0
            setTtsLevel((prev) => (prev * 0.7) + (clamp(avg * 1.4, 0, 1) * 0.3))
            rafIdRef.current = requestAnimationFrame(tick)
        }

        rafIdRef.current = requestAnimationFrame(tick)
    }, [])

    const getCachedTtsBlob = useCallback((cacheKey: string): Blob | null => {
        const cache = ttsCacheRef.current
        const cached = cache.get(cacheKey)
        if (!cached) return null

        // Refresh insertion order to keep most recently used entries.
        cache.delete(cacheKey)
        cache.set(cacheKey, cached)
        return cached
    }, [])

    const setCachedTtsBlob = useCallback((cacheKey: string, blob: Blob) => {
        const cache = ttsCacheRef.current
        if (cache.has(cacheKey)) {
            cache.delete(cacheKey)
        }
        cache.set(cacheKey, blob)

        while (cache.size > TTS_CACHE_LIMIT) {
            const oldestKey = cache.keys().next().value
            if (!oldestKey) break
            cache.delete(oldestKey)
        }
    }, [])

    const onEndRef = useRef<(() => void) | null>(null)

    const speak = useCallback(async (text: string, onEnd?: () => void) => {
        onEndRef.current = onEnd ?? null
        const key = import.meta.env.VITE_OPENAI_API_KEY
        if (!key) return

        const cleaned = sanitizeTtsText(text)
        if (!cleaned || cleaned.length < 2) return

        stopSpeaking()

        const audioContext = await ensureAudioContext()
        if (!audioContext) return

        const cacheKey = `${voice}:${cleaned}`
        let audioBlob = getCachedTtsBlob(cacheKey)

        if (!audioBlob) {
            const response = await fetch(OPENAI_TTS_API, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini-tts',
                    input: cleaned,
                    voice,
                    response_format: 'opus',
                    speed: 1.15,
                    instructions: 'Fala em português europeu com articulação clara e ritmo natural.',
                }),
            })

            if (!response.ok) {
                console.error('Symbiote TTS error:', response.status, await response.text())
                return
            }

            audioBlob = await response.blob()
            setCachedTtsBlob(cacheKey, audioBlob)
        }

        const objectUrl = URL.createObjectURL(audioBlob)
        objectUrlRef.current = objectUrl

        const audio = new Audio(objectUrl)
        audio.crossOrigin = 'anonymous'
        audioElRef.current = audio

        const source = audioContext.createMediaElementSource(audio)
        sourceNodeRef.current = source

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.78
        analyserRef.current = analyser

        source.connect(analyser)
        analyser.connect(audioContext.destination)
        monitorTtsAnalyser(analyser)

        setIsSpeaking(true)
        const finish = () => {
            const cb = onEndRef.current
            onEndRef.current = null
            stopSpeaking()
            cb?.()
        }
        audio.onended = finish
        audio.onerror = finish

        try {
            await audio.play()
        } catch {
            finish()
        }
    }, [ensureAudioContext, getCachedTtsBlob, monitorTtsAnalyser, setCachedTtsBlob, stopSpeaking, voice])

    const startListening = useCallback(async () => {
        await speechService.startRecording(setSpeechState, onTranscript)
    }, [onTranscript])

    const stopListening = useCallback(async (): Promise<string | null> => {
        return speechService.stopRecording()
    }, [])

    const cancelListening = useCallback(() => {
        speechService.cancelRecording()
        setSpeechState({ status: 'idle', level: 0 })
    }, [])

    useEffect(() => {
        return () => {
            speechService.cancelRecording()
            stopSpeaking()
            ttsCacheRef.current.clear()
            const context = audioContextRef.current
            audioContextRef.current = null
            if (context && context.state !== 'closed') {
                void context.close()
            }
        }
    }, [stopSpeaking])

    const micLevel = clamp(speechState.level ?? 0, 0, 1)
    const visualLevel = clamp(Math.max(micLevel * 0.95, ttsLevel), 0, 1)

    const ttsAnalyser = analyserRef.current

    return useMemo(() => ({
        speechState,
        isRecording: speechState.status === 'recording',
        isTranscribing: speechState.status === 'transcribing',
        isSpeaking,
        micLevel,
        ttsLevel,
        visualLevel,
        isAvailable: speechService.isMicAvailable(),
        ttsAnalyser,
        startListening,
        stopListening,
        cancelListening,
        speak,
        stopSpeaking,
    }), [
        speechState,
        isSpeaking,
        micLevel,
        ttsLevel,
        visualLevel,
        ttsAnalyser,
        startListening,
        stopListening,
        cancelListening,
        speak,
        stopSpeaking,
    ])
}
