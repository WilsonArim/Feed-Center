import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSymbioteStore } from '@/stores/symbioteStore'

interface SpotlightRect {
    top: number
    left: number
    width: number
    height: number
}

interface SpotlightContextType {
    hoveredId: string | null
    focusedElementId: string | null
    activeSpotlightId: string | null
    setHoveredId: (id: string | null) => void
    setFocusedElementId: (id: string | null) => void
    clearFocusedElementId: () => void
    getTargetProps: (spotlightId: string) => {
        'data-spotlight-id': string
        onMouseEnter: () => void
        onMouseLeave: () => void
    }
}

const SpotlightContext = createContext<SpotlightContextType>({
    hoveredId: null,
    focusedElementId: null,
    activeSpotlightId: null,
    setHoveredId: () => undefined,
    setFocusedElementId: () => undefined,
    clearFocusedElementId: () => undefined,
    getTargetProps: (spotlightId: string) => ({
        'data-spotlight-id': spotlightId,
        onMouseEnter: () => undefined,
        onMouseLeave: () => undefined,
    }),
})

function escapeSelector(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value)
    }
    return value.replace(/["\\]/g, '\\$&')
}

function resolveTargetElement(spotlightId: string): HTMLElement | null {
    if (!spotlightId.trim()) return null

    const escaped = escapeSelector(spotlightId)
    const byDataAttr = document.querySelector<HTMLElement>(`[data-spotlight-id="${escaped}"]`)
    if (byDataAttr) return byDataAttr

    return document.getElementById(spotlightId)
}

function buildSpotlightRect(target: HTMLElement): SpotlightRect | null {
    const rect = target.getBoundingClientRect()
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null
    if (rect.width <= 1 || rect.height <= 1) return null

    const padX = Math.max(6, Math.min(18, rect.width * 0.08))
    const padY = Math.max(6, Math.min(18, rect.height * 0.2))

    return {
        top: Math.max(0, rect.top - padY),
        left: Math.max(0, rect.left - padX),
        width: rect.width + (padX * 2),
        height: rect.height + (padY * 2),
    }
}

function isSameRect(current: SpotlightRect | null, next: SpotlightRect | null): boolean {
    if (!current || !next) return current === next

    return (
        Math.abs(current.top - next.top) < 0.5
        && Math.abs(current.left - next.left) < 0.5
        && Math.abs(current.width - next.width) < 0.5
        && Math.abs(current.height - next.height) < 0.5
    )
}

export function CognitiveSpotlightProvider({ children }: { children: React.ReactNode }) {
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)

    const focusedElementId = useSymbioteStore((state) => state.focusedElementId)
    const setFocusedElementId = useSymbioteStore((state) => state.setFocusedElementId)
    const clearFocusedElementId = useSymbioteStore((state) => state.clearFocusedElementId)

    const activeSpotlightId = focusedElementId ?? hoveredId

    useEffect(() => {
        if (!activeSpotlightId) {
            setSpotlightRect(null)
            return
        }

        let frameId: number | null = null
        let cancelled = false

        const track = () => {
            if (cancelled) return

            const target = resolveTargetElement(activeSpotlightId)
            const nextRect = target ? buildSpotlightRect(target) : null
            setSpotlightRect((current) => (isSameRect(current, nextRect) ? current : nextRect))

            frameId = requestAnimationFrame(track)
        }

        track()

        return () => {
            cancelled = true
            if (frameId !== null) {
                cancelAnimationFrame(frameId)
            }
        }
    }, [activeSpotlightId])

    const handlePointerMoveCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (focusedElementId) return
        const origin = event.target
        if (!(origin instanceof Element)) return

        const target = origin.closest<HTMLElement>('[data-spotlight-id]')
        const nextHover = target?.dataset.spotlightId?.trim() || null
        setHoveredId((current) => (current === nextHover ? current : nextHover))
    }, [focusedElementId])

    const getTargetProps = useCallback((spotlightId: string) => ({
        'data-spotlight-id': spotlightId,
        onMouseEnter: () => setHoveredId(spotlightId),
        onMouseLeave: () => setHoveredId((current) => (current === spotlightId ? null : current)),
    }), [])

    const contextValue = useMemo<SpotlightContextType>(() => ({
        hoveredId,
        focusedElementId,
        activeSpotlightId,
        setHoveredId,
        setFocusedElementId,
        clearFocusedElementId,
        getTargetProps,
    }), [
        hoveredId,
        focusedElementId,
        activeSpotlightId,
        setFocusedElementId,
        clearFocusedElementId,
        getTargetProps,
    ])

    return (
        <SpotlightContext.Provider value={contextValue}>
            <div
                className="relative flex h-full w-full flex-col transition-all duration-700 ease-out"
                onMouseMoveCapture={handlePointerMoveCapture}
                onMouseLeave={() => setHoveredId(null)}
            >
                {children}

                {spotlightRect && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed z-[52] rounded-2xl transition-[top,left,width,height,opacity] duration-220 ease-out"
                        style={{
                            top: spotlightRect.top,
                            left: spotlightRect.left,
                            width: spotlightRect.width,
                            height: spotlightRect.height,
                            border: '1px solid rgba(186,230,253,0.75)',
                            background: 'rgba(15,23,42,0.12)',
                            boxShadow: '0 0 0 9999px rgba(2,6,23,0.58), 0 0 0 1px rgba(255,255,255,0.28), 0 0 36px rgba(56,189,248,0.35)',
                        }}
                    />
                )}
            </div>
        </SpotlightContext.Provider>
    )
}

export const useSpotlight = () => useContext(SpotlightContext)
