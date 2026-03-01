import { create } from 'zustand'

interface SymbioteState {
    isOpen: boolean
    micEnabled: boolean
    focusedElementId: string | null
    open: () => void
    close: () => void
    toggle: () => void
    setMicEnabled: (enabled: boolean) => void
    setFocusedElementId: (elementId: string | null) => void
    clearFocusedElementId: () => void
}

export const useSymbioteStore = create<SymbioteState>((set) => ({
    isOpen: false,
    micEnabled: true,
    focusedElementId: null,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false, focusedElementId: null }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen, focusedElementId: state.isOpen ? null : state.focusedElementId })),
    setMicEnabled: (enabled) => set({ micEnabled: enabled }),
    setFocusedElementId: (elementId) => set({ focusedElementId: elementId }),
    clearFocusedElementId: () => set({ focusedElementId: null }),
}))
