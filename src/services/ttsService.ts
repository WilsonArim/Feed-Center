export const SYMBIOTE_TTS_REQUEST_EVENT = 'fc:symbiote:tts-request'

export interface TtsSpeakOptions {
    source?: string
    forceOpen?: boolean
}

export interface TtsRequestDetail {
    text: string
    source: string
    forceOpen: boolean
}

class TtsService {
    speak(text: string, options?: TtsSpeakOptions): boolean {
        if (typeof window === 'undefined') return false
        const cleaned = text.replace(/\s+/g, ' ').trim()
        if (!cleaned) return false

        const detail: TtsRequestDetail = {
            text: cleaned,
            source: options?.source?.trim() || 'system',
            forceOpen: options?.forceOpen === true,
        }

        window.dispatchEvent(new CustomEvent<TtsRequestDetail>(SYMBIOTE_TTS_REQUEST_EVENT, { detail }))
        return true
    }
}

export const ttsService = new TtsService()
