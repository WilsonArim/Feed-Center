/**
 * TTS Service — OpenAI Text-to-Speech
 *
 * Uses the `tts-1` model with the 'nova' voice (clear, friendly).
 * Caches audio to avoid re-synthesizing the same text.
 * Auto-manages playback queue.
 */

const TTS_API = 'https://api.openai.com/v1/audio/speech'

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

class TtsService {
    private audio: HTMLAudioElement | null = null
    private cache = new Map<string, string>() // text hash → objectURL
    private playing = false

    isAvailable(): boolean {
        return !!import.meta.env.VITE_OPENAI_API_KEY
    }

    async speak(text: string, voice: TtsVoice = 'onyx'): Promise<void> {
        if (!this.isAvailable()) return

        // Stop any current playback
        this.stop()

        // Clean text for TTS (remove emojis, markdown markers)
        const cleaned = text
            .replace(/[*_~`#]/g, '')
            .replace(/\p{Emoji_Presentation}/gu, '')
            .replace(/\s+/g, ' ')
            .trim()

        if (!cleaned || cleaned.length < 2) return

        // Check cache
        const cacheKey = `${voice}:${cleaned}`
        let url = this.cache.get(cacheKey)

        if (!url) {
            const key = import.meta.env.VITE_OPENAI_API_KEY
            try {
                const res = await fetch(TTS_API, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini-tts',
                        input: cleaned,
                        voice,
                        response_format: 'opus',
                        speed: 1.2,
                        instructions: 'Fala em português europeu (de Portugal), com sotaque natural de Portugal. Não uses sotaque brasileiro. Voz calma e clara.',
                    }),
                })

                if (!res.ok) {
                    console.error('TTS error:', res.status, await res.text())
                    return
                }

                const blob = await res.blob()
                url = URL.createObjectURL(blob)
                this.cache.set(cacheKey, url)

                // Limit cache to 20 entries
                if (this.cache.size > 20) {
                    const first = this.cache.keys().next().value
                    if (first) {
                        URL.revokeObjectURL(this.cache.get(first)!)
                        this.cache.delete(first)
                    }
                }
            } catch (err) {
                console.error('TTS failed:', err)
                return
            }
        }

        // Play audio
        this.audio = new Audio(url)
        this.playing = true
        this.audio.onended = () => { this.playing = false }
        this.audio.onerror = () => { this.playing = false }

        try {
            await this.audio.play()
        } catch {
            this.playing = false
        }
    }

    stop(): void {
        if (this.audio) {
            this.audio.pause()
            this.audio.currentTime = 0
            this.audio = null
        }
        this.playing = false
    }

    isPlaying(): boolean {
        return this.playing
    }
}

export const ttsService = new TtsService()
