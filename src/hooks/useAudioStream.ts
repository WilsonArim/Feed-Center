import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioStreamStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export interface AudioStreamState {
    status: AudioStreamStatus
    level: number            // 0–1 RMS average
    frequencyData: Uint8Array | null  // Raw frequency bins for waveform
    error: string | null
}

interface UseAudioStreamOptions {
    fftSize?: number          // Power of 2 between 32–2048 (default 128)
    smoothing?: number        // 0–1 (default 0.7)
}

interface UseAudioStreamResult {
    state: AudioStreamState
    start: () => Promise<boolean>
    stop: () => void
    analyser: AnalyserNode | null
}

/**
 * Low-level hook for real-time microphone capture with Web Audio API.
 * Handles getUserMedia permissions gracefully, provides AnalyserNode
 * frequency data on every animation frame.
 */
export function useAudioStream(options?: UseAudioStreamOptions): UseAudioStreamResult {
    const fftSize = options?.fftSize ?? 128
    const smoothing = options?.smoothing ?? 0.7

    const [state, setState] = useState<AudioStreamState>({
        status: 'idle',
        level: 0,
        frequencyData: null,
        error: null,
    })

    const streamRef = useRef<MediaStream | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const rafRef = useRef<number | null>(null)
    const frequencyBufferRef = useRef<Uint8Array | null>(null)

    const cleanup = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        if (sourceRef.current) {
            sourceRef.current.disconnect()
            sourceRef.current = null
        }

        if (analyserRef.current) {
            analyserRef.current.disconnect()
            analyserRef.current = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }

        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => { /* noop */ })
            audioCtxRef.current = null
        }

        frequencyBufferRef.current = null
    }, [])

    const start = useCallback(async (): Promise<boolean> => {
        // Already active
        if (streamRef.current) return true

        // Check browser support
        if (!navigator.mediaDevices?.getUserMedia) {
            setState({ status: 'error', level: 0, frequencyData: null, error: 'Browser does not support getUserMedia' })
            return false
        }

        setState(prev => ({ ...prev, status: 'requesting', error: null }))

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            })

            streamRef.current = stream

            // Create audio context + analyser
            const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
            const audioCtx = new AudioCtx()
            audioCtxRef.current = audioCtx

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume()
            }

            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = fftSize
            analyser.smoothingTimeConstant = smoothing
            analyserRef.current = analyser

            const source = audioCtx.createMediaStreamSource(stream)
            sourceRef.current = source
            source.connect(analyser)

            // Allocate frequency buffer
            const buffer = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
            frequencyBufferRef.current = buffer

            // Start animation frame loop
            const tick = () => {
                if (!analyserRef.current || !frequencyBufferRef.current) return

                analyserRef.current.getByteFrequencyData(frequencyBufferRef.current as Uint8Array<ArrayBuffer>)

                // Compute RMS level (0–1)
                let sum = 0
                for (let i = 0; i < frequencyBufferRef.current.length; i++) {
                    const n = frequencyBufferRef.current[i]! / 255
                    sum += n * n
                }
                const rms = Math.sqrt(sum / frequencyBufferRef.current.length)

                setState({
                    status: 'active',
                    level: rms,
                    frequencyData: frequencyBufferRef.current,
                    error: null,
                })

                rafRef.current = requestAnimationFrame(tick)
            }
            rafRef.current = requestAnimationFrame(tick)

            return true
        } catch (err) {
            cleanup()

            const error = err instanceof DOMException
                ? err.name === 'NotAllowedError'
                    ? 'Microphone permission denied. Please allow access in your browser settings.'
                    : err.name === 'NotFoundError'
                        ? 'No microphone found. Please connect a microphone.'
                        : err.message
                : err instanceof Error
                    ? err.message
                    : 'Failed to access microphone'

            const status: AudioStreamStatus = err instanceof DOMException && err.name === 'NotAllowedError'
                ? 'denied'
                : 'error'

            setState({ status, level: 0, frequencyData: null, error })
            return false
        }
    }, [fftSize, smoothing, cleanup])

    const stop = useCallback(() => {
        cleanup()
        setState({ status: 'idle', level: 0, frequencyData: null, error: null })
    }, [cleanup])

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup()
    }, [cleanup])

    return {
        state,
        start,
        stop,
        analyser: analyserRef.current,
    }
}
