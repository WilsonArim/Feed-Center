/**
 * Speech Service — Whisper-powered voice input
 *
 * Architecture:
 *   1. MediaRecorder captures audio (browser picks best codec)
 *   2. Blob is wrapped in a File with correct extension
 *   3. Sent to backend proxy at /api/cortex/transcribe (avoids CORS)
 *
 * Codec detection:
 * Some browsers set mimeType with codecs suffix (audio/webm;codecs=opus) which can
 * confuse the API. We strip it and ensure a clean filename.
 */

const TRANSCRIBE_PROXY = '/api/cortex/transcribe'

export interface SpeechState {
    status: 'idle' | 'recording' | 'transcribing' | 'error'
    level: number
    error?: string
}

type StatusCallback = (state: SpeechState) => void
type TranscriptCallback = (text: string) => void

class SpeechService {
    private mediaRecorder: MediaRecorder | null = null
    private stream: MediaStream | null = null
    private ownsStream = true
    private chunks: Blob[] = []
    private onStatus: StatusCallback | null = null
    private onTranscript: TranscriptCallback | null = null
    private recordedMimeType = ''
    private silenceTimer: ReturnType<typeof setTimeout> | null = null
    private maxTimer: ReturnType<typeof setTimeout> | null = null
    private audioContext: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private animFrame: number | null = null

    /** Can the browser capture audio at all? (Independent of API key) */
    isMicAvailable(): boolean {
        return !!navigator.mediaDevices?.getUserMedia
    }

    /** Can we record AND transcribe via Whisper? (Requires API key or proxy) */
    isTranscriptionAvailable(): boolean {
        return this.isMicAvailable() && !!(import.meta.env.VITE_OPENAI_API_KEY || TRANSCRIBE_PROXY)
    }

    /** @deprecated Use isMicAvailable() or isTranscriptionAvailable() */
    isAvailable(): boolean {
        return this.isMicAvailable()
    }

    async startRecording(
        onStatus: StatusCallback,
        onTranscript?: TranscriptCallback,
        existingStream?: MediaStream,
    ): Promise<void> {
        this.onStatus = onStatus
        this.onTranscript = onTranscript ?? null

        try {
            // Reuse existing stream (from useAudioStream) or request a new one
            this.stream = existingStream ?? await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            })
            // If reusing an external stream, don't stop its tracks on cleanup
            this.ownsStream = !existingStream

            // Pick best supported mime type
            const candidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
            ]
            let mimeType = ''
            for (const c of candidates) {
                if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break }
            }

            // Store the base mime for later
            this.recordedMimeType = mimeType

            const options: MediaRecorderOptions = {}
            if (mimeType) options.mimeType = mimeType

            this.mediaRecorder = new MediaRecorder(this.stream, options)
            this.chunks = []

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data)
            }

            // Setup analyser for level visualization
            this.audioContext = new AudioContext()
            const source = this.audioContext.createMediaStreamSource(this.stream)
            this.analyser = this.audioContext.createAnalyser()
            this.analyser.fftSize = 256
            this.analyser.smoothingTimeConstant = 0.85
            source.connect(this.analyser)
            this.monitorLevel()

            this.mediaRecorder.start(500) // 500ms timeslice
            this.emit({ status: 'recording', level: 0 })

            // Auto-stop after 30s
            this.maxTimer = setTimeout(() => this.stopRecording(), 30_000)

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao aceder ao microfone'
            this.emit({ status: 'error', level: 0, error: msg })
            this.onTranscript = null
            this.cleanup()
        }
    }

    async stopRecording(): Promise<string | null> {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
            return null
        }

        return new Promise<string | null>((resolve) => {
            const recorder = this.mediaRecorder!
            const savedMime = this.recordedMimeType || recorder.mimeType || 'audio/webm'

            recorder.onstop = async () => {
                this.emit({ status: 'transcribing', level: 0 })

                // Collect chunks and build blob
                const allChunks = [...this.chunks]
                this.cleanup()

                if (allChunks.length === 0) {
                    this.emit({ status: 'idle', level: 0 })
                    this.onTranscript = null
                    resolve(null)
                    return
                }

                // Use base mime (strip codecs info like ";codecs=opus")
                const baseMime = savedMime.split(';')[0]!.trim()
                const blob = new Blob(allChunks, { type: baseMime })

                if (blob.size < 1000) {
                    this.emit({ status: 'idle', level: 0 })
                    this.onTranscript = null
                    resolve(null)
                    return
                }

                const text = await this.transcribe(blob, baseMime)
                this.emit({ status: 'idle', level: 0 })
                if (text) {
                    this.onTranscript?.(text)
                }
                this.onTranscript = null
                resolve(text)
            }

            recorder.stop()
        })
    }

    cancelRecording(): void {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.onstop = null
            this.mediaRecorder.stop()
        }
        this.onTranscript = null
        this.cleanup()
        this.emit({ status: 'idle', level: 0 })
    }

    private async transcribe(blob: Blob, mime: string): Promise<string | null> {
        // Map mime → extension that Whisper recognizes
        const extMap: Record<string, string> = {
            'audio/webm': 'webm',
            'audio/ogg': 'ogg',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/flac': 'flac',
        }
        const ext = extMap[mime] || 'webm'

        // Create File with clean mime and correct extension
        const file = new File([blob], `recording.${ext}`, { type: mime })

        const form = new FormData()
        form.append('file', file)
        form.append('language', 'pt')
        form.append('prompt', 'Feed Center, Buggy, crypto, Bitcoin, Solana, Ethereum, todo, financeiro, pocket, saldo')

        try {
            const res = await fetch(TRANSCRIBE_PROXY, {
                method: 'POST',
                body: form,
            })

            if (!res.ok) {
                const errBody = await res.text()
                console.error('Whisper proxy error:', res.status, errBody)
                this.emit({ status: 'error', level: 0, error: `Whisper (${res.status}): ${errBody.slice(0, 100)}` })
                return null
            }

            const text = await res.text()
            return text.trim() || null
        } catch (err) {
            console.error('Whisper failed:', err)
            this.emit({ status: 'error', level: 0, error: 'Falha na transcrição' })
            return null
        }
    }

    private monitorLevel(): void {
        if (!this.analyser) return
        const data = new Uint8Array(this.analyser.frequencyBinCount)

        const tick = () => {
            if (!this.analyser) return
            this.analyser.getByteFrequencyData(data)
            let sum = 0
            for (let i = 0; i < data.length; i++) sum += data[i]!
            const avg = sum / data.length / 255
            this.emit({ status: 'recording', level: avg })
            this.animFrame = requestAnimationFrame(tick)
        }
        tick()
    }

    private emit(state: SpeechState): void {
        this.onStatus?.(state)
    }

    private cleanup(): void {
        if (this.animFrame) cancelAnimationFrame(this.animFrame)
        if (this.silenceTimer) clearTimeout(this.silenceTimer)
        if (this.maxTimer) clearTimeout(this.maxTimer)
        if (this.stream && this.ownsStream) this.stream.getTracks().forEach(t => t.stop())
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close().catch(() => { })
        }
        this.mediaRecorder = null
        this.stream = null
        this.ownsStream = true
        this.chunks = []
        this.audioContext = null
        this.analyser = null
        this.animFrame = null
        this.silenceTimer = null
        this.maxTimer = null
    }
}

export const speechService = new SpeechService()
