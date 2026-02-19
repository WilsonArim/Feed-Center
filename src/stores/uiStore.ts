import { create } from 'zustand'

interface UIState {
    sidebarOpen: boolean
    pinnedItems: string[]
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    togglePin: (id: string) => void
}

const stored = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('fc-pinned') ?? '[]') as string[]
    : []

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    pinnedItems: stored,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    togglePin: (id) =>
        set((s) => {
            const next = s.pinnedItems.includes(id)
                ? s.pinnedItems.filter((p) => p !== id)
                : [...s.pinnedItems, id]
            localStorage.setItem('fc-pinned', JSON.stringify(next))
            return { pinnedItems: next }
        }),
}))
