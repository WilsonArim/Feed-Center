import { create } from 'zustand'

export type SerafimEmotion = 'idle' | 'observing' | 'happy' | 'worried' | 'processing'

interface SerafimState {
    emotion: SerafimEmotion
    target: { x: number, y: number } | null // For eyes to follow
    message: string | null // Bubble text

    setEmotion: (emotion: SerafimEmotion) => void
    setTarget: (x: number, y: number) => void
    clearTarget: () => void
    say: (text: string, duration?: number) => void

    // Transient triggers
    triggerHappy: (duration?: number) => void
    triggerWorried: (duration?: number) => void
}

export const useSerafimStore = create<SerafimState>((set, get) => ({
    emotion: 'idle',
    target: null,
    message: null,

    setEmotion: (emotion) => set({ emotion }),
    setTarget: (x, y) => set({ target: { x, y } }),
    clearTarget: () => set({ target: null }),

    say: (text, duration = 3000) => {
        set({ message: text, emotion: 'observing' }) // Usually observing when talking
        setTimeout(() => {
            set({ message: null, emotion: 'idle' })
        }, duration)
    },

    triggerHappy: (duration = 3000) => {
        const prev = get().emotion
        set({ emotion: 'happy' })
        setTimeout(() => set({ emotion: prev }), duration)
    },

    triggerWorried: (duration = 4000) => {
        const prev = get().emotion
        set({ emotion: 'worried' })
        setTimeout(() => set({ emotion: prev }), duration)
    }
}))
