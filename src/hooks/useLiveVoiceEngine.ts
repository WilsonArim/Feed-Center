import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioStream } from '@/hooks/useAudioStream'
import { useSymbioteAudio, type SymbioteVoice } from '@/hooks/useSymbioteAudio'
import { speechService } from '@/services/speechService'

/**
 * Live Voice Engine — Two-way voice conversation loop.
 *
 * State machine:
 *   idle → listening → processing → speaking → listening (loop) or idle (manual stop)
 *
 * Flow:
 *   1. User presses "live voice" → mic opens, waveform reacts to user voice
 *   2. VAD detects silence (~1.5s) → auto-stops recording
 *   3. Audio transcribed via speechService (Whisper)
 *   4. Parent dispatches transcript to cortex, gets reply
 *   5. Parent calls speakReply(text) → TTS plays, waveform reacts to Buggy's voice
 *   6. TTS finishes → auto-resumes listening (continuous mode)
 */

export type LiveVoicePhase = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseLiveVoiceEngineOptions {
    /** Called when VAD triggers and transcription completes */
    onTranscript: (text: string) => void
    onError?: (msg: string) => void
    voice?: SymbioteVoice
    /** RMS level below which counts as silence (default 0.04) */
    silenceThreshold?: number
    /** ms of continuous silence before auto-stop (default 1500) */
    silenceTimeout?: number
}

interface UseLiveVoiceEngineResult {
    phase: LiveVoicePhase
    /** Start the live voice session */
    start: () => Promise<boolean>
    /** Manually stop everything (recording + TTS) */
    stop: () => void
    /** Parent calls this after getting cortex reply — plays TTS */
    speakReply: (text: string) => Promise<void>
    /** Stop TTS mid-sentence */
    stopSpeaking: () => void
    /** AnalyserNode that drives the waveform — mic when listening, TTS when speaking */
    activeAnalyser: AnalyserNode | null
    /** Combined audio level 0–1 */
    level: number
    /** Elapsed seconds since session started */
    elapsed: number
    /** Last transcribed text */
    transcript: string | null
}

export function useLiveVoiceEngine(options: UseLiveVoiceEngineOptions): UseLiveVoiceEngineResult {
    const {
        onTranscript,
        onError,
        voice,
        silenceThreshold = 0.04,
        silenceTimeout = 1500,
    } = options

    const [phase, setPhase] = useState<LiveVoicePhase>('idle')
    const [transcript, setTranscript] = useState<string | null>(null)
    const [elapsed, setElapsed] = useState(0)

    const phaseRef = useRef<LiveVoicePhase>('idle')
    const silenceStartRef = useRef<number | null>(null)
    const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const vadCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const autoResumeRef = useRef(false)
    const onTranscriptRef = useRef(onTranscript)
    const onErrorRef = useRef(onError)
    onTranscriptRef.current = onTranscript
    onErrorRef.current = onError

    // Mic stream for waveform visualization
    const audioStream = useAudioStream({ fftSize: 128, smoothing: 0.72 })

    // TTS engine (speak + analyser)
    const symbioteAudio = useSymbioteAudio({ voice })

    const updatePhase = useCallback((p: LiveVoicePhase) => {
        phaseRef.current = p
        setPhase(p)
    }, [])

    // Start recording via speechService using the same stream as audioStream
    const startRecording = useCallback(() => {
        const stream = audioStream.state.status === 'active'
            ? (() => {
                // Access the stream from the audio context's source node
                // We need to get the raw MediaStream — it's stored in useAudioStream's ref
                // Since we can't access it directly, we'll let speechService get its own stream
                // But we pass nothing for existingStream — both will share the mic fine on modern browsers
                return undefined
            })()
            : undefined

        speechService.startRecording(
            () => { /* level monitoring handled by useAudioStream */ },
            (text) => {
                // Transcription complete
                if (text && text.trim()) {
                    setTranscript(text.trim())
                    updatePhase('processing')
                    onTranscriptRef.current(text.trim())
                } else {
                    // Empty transcript — resume listening
                    if (phaseRef.current !== 'idle') {
                        updatePhase('listening')
                        startRecording()
                    }
                }
            },
            stream,
        ).catch((err) => {
            console.error('Live voice recording error:', err)
            onErrorRef.current?.('Failed to start recording')
        })
    }, [audioStream.state.status, updatePhase])

    // VAD: monitor audioStream level for silence detection
    useEffect(() => {
        if (phase !== 'listening') {
            silenceStartRef.current = null
            return
        }

        vadCheckRef.current = setInterval(() => {
            const level = audioStream.state.level

            if (level < silenceThreshold) {
                if (silenceStartRef.current === null) {
                    silenceStartRef.current = Date.now()
                } else if (Date.now() - silenceStartRef.current >= silenceTimeout) {
                    // Silence detected — stop recording and transcribe
                    silenceStartRef.current = null
                    speechService.stopRecording().catch(() => { /* handled by callback */ })
                }
            } else {
                // User is speaking — reset silence timer
                silenceStartRef.current = null
            }
        }, 100) // Check every 100ms

        return () => {
            if (vadCheckRef.current) {
                clearInterval(vadCheckRef.current)
                vadCheckRef.current = null
            }
        }
    }, [phase, audioStream.state.level, silenceThreshold, silenceTimeout])

    // Elapsed timer
    useEffect(() => {
        if (phase !== 'idle') {
            setElapsed(0)
            elapsedTimerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
        }
        return () => {
            if (elapsedTimerRef.current) {
                clearInterval(elapsedTimerRef.current)
                elapsedTimerRef.current = null
            }
        }
    }, [phase !== 'idle']) // eslint-disable-line react-hooks/exhaustive-deps

    const start = useCallback(async (): Promise<boolean> => {
        if (phaseRef.current !== 'idle') return true

        // Start mic for visualization
        const ok = await audioStream.start()
        if (!ok) return false

        autoResumeRef.current = true
        updatePhase('listening')
        setTranscript(null)

        // Start recording (speechService will open its own stream — modern browsers handle this fine)
        speechService.startRecording(
            () => { /* level handled by audioStream */ },
            (text) => {
                if (text && text.trim()) {
                    setTranscript(text.trim())
                    updatePhase('processing')
                    onTranscriptRef.current(text.trim())
                } else if (phaseRef.current !== 'idle') {
                    // Empty result — restart recording
                    updatePhase('listening')
                    speechService.startRecording(
                        () => {},
                        (t) => {
                            if (t && t.trim()) {
                                setTranscript(t.trim())
                                updatePhase('processing')
                                onTranscriptRef.current(t.trim())
                            }
                        },
                    ).catch(() => {})
                }
            },
        ).catch((err) => {
            console.error('Live voice start error:', err)
            onErrorRef.current?.('Failed to start recording')
            audioStream.stop()
            updatePhase('idle')
        })

        return true
    }, [audioStream, updatePhase])

    const stop = useCallback(() => {
        autoResumeRef.current = false
        speechService.cancelRecording()
        symbioteAudio.stopSpeaking()
        audioStream.stop()
        updatePhase('idle')
        silenceStartRef.current = null
    }, [audioStream, symbioteAudio, updatePhase])

    const speakReply = useCallback(async (text: string) => {
        updatePhase('speaking')

        await symbioteAudio.speak(text, () => {
            // TTS finished — auto-resume listening if session still active
            if (autoResumeRef.current && phaseRef.current === 'speaking') {
                updatePhase('listening')
                speechService.startRecording(
                    () => {},
                    (t) => {
                        if (t && t.trim()) {
                            setTranscript(t.trim())
                            updatePhase('processing')
                            onTranscriptRef.current(t.trim())
                        } else if (phaseRef.current !== 'idle') {
                            updatePhase('listening')
                            // Retry recording
                            speechService.startRecording(() => {}, (t2) => {
                                if (t2 && t2.trim()) {
                                    setTranscript(t2.trim())
                                    updatePhase('processing')
                                    onTranscriptRef.current(t2.trim())
                                }
                            }).catch(() => {})
                        }
                    },
                ).catch(() => {
                    // If re-record fails, stay in listening but don't crash
                    if (phaseRef.current !== 'idle') updatePhase('listening')
                })
            } else {
                updatePhase('idle')
                audioStream.stop()
            }
        })
    }, [symbioteAudio, audioStream, updatePhase])

    const stopSpeaking = useCallback(() => {
        symbioteAudio.stopSpeaking()
        if (autoResumeRef.current) {
            updatePhase('listening')
        } else {
            updatePhase('idle')
        }
    }, [symbioteAudio, updatePhase])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            autoResumeRef.current = false
            speechService.cancelRecording()
        }
    }, [])

    // Active analyser: mic when listening, TTS when speaking
    const activeAnalyser = phase === 'speaking'
        ? symbioteAudio.ttsAnalyser
        : audioStream.analyser

    // Combined level
    const level = phase === 'speaking'
        ? symbioteAudio.ttsLevel
        : audioStream.state.level

    return {
        phase,
        start,
        stop,
        speakReply,
        stopSpeaking,
        activeAnalyser,
        level,
        elapsed,
        transcript,
    }
}
