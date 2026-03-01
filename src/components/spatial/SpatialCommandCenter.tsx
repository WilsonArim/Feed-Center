import { Outlet } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { EnginePane } from './EnginePane'
import { RealityPane } from './RealityPane'
import { BackToBuggyFAB } from './BackToBuggyFAB'
import { BuggyFAB, BuggyBottomSheet } from './BuggyMobileSheet'
import { FloatingNav } from '../core/FloatingNav'
import { OnboardingModal } from '../onboarding/OnboardingModal'
import { useThemeStore } from '@/stores/themeStore'
import { hydrateModuleStore } from '@/stores/moduleStore'
import { useEffect, useState, useSyncExternalStore, useCallback } from 'react'

/* ── Responsive breakpoint hook ── */

function subscribeMQ(cb: () => void) {
    const mql = window.matchMedia('(max-width: 767px)')
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
}

function getIsMobile() {
    return window.matchMedia('(max-width: 767px)').matches
}

function getIsMobileServer() {
    return false
}

function useIsMobile() {
    return useSyncExternalStore(subscribeMQ, getIsMobile, getIsMobileServer)
}

/* ── Buggy position preference ── */

const BUGGY_POS_KEY = 'fc-buggy-position'
export type BuggyPosition = 'adaptive' | 'sidebar'

export function getBuggyPosition(): BuggyPosition {
    try {
        const v = localStorage.getItem(BUGGY_POS_KEY)
        return v === 'sidebar' ? 'sidebar' : 'adaptive'
    } catch { return 'adaptive' }
}

export function setBuggyPosition(pos: BuggyPosition) {
    try { localStorage.setItem(BUGGY_POS_KEY, pos) } catch { /* noop */ }
}

/* ── Theme Sync ── */

function ThemeSync() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
    useEffect(() => {
        const root = document.documentElement
        root.classList.toggle('dark', resolvedTheme === 'dark')
        root.classList.toggle('light', resolvedTheme === 'light')
    }, [resolvedTheme])
    return null
}

/* ── Page transition variants ── */

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    enter: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
}

/* ── Main Layout ── */

export function SpatialCommandCenter() {
    const mobileFocus = useWorkspaceStore((s) => s.mobileFocus)
    const viewKind = useWorkspaceStore((s) => s.view.kind)
    const isMobile = useIsMobile()
    const [buggyPos, setBuggyPos] = useState<BuggyPosition>(getBuggyPosition)
    const [sheetOpen, setSheetOpen] = useState(false)

    // Listen for preference changes from settings page
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === BUGGY_POS_KEY) setBuggyPos(getBuggyPosition())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    // Also listen for custom event (same-tab updates from settings)
    useEffect(() => {
        const onUpdate = () => setBuggyPos(getBuggyPosition())
        window.addEventListener('buggy-position-changed', onUpdate)
        return () => window.removeEventListener('buggy-position-changed', onUpdate)
    }, [])

    // Hydrate onboarding + module state from Supabase on mount
    useEffect(() => {
        void hydrateModuleStore()
    }, [])

    // Close sheet when workspace navigates to a result view
    useEffect(() => {
        if (viewKind !== 'page' && viewKind !== 'idle') {
            setSheetOpen(false)
        }
    }, [viewKind])

    // Keyboard shortcut: / opens sheet on mobile
    useEffect(() => {
        if (!useFAB) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const target = e.target as HTMLElement
                const tag = target.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
                e.preventDefault()
                setSheetOpen(true)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    })

    // Should we use FAB+Sheet instead of sidebar?
    const useFAB = isMobile && buggyPos === 'adaptive'

    const handleCloseSheet = useCallback(() => setSheetOpen(false), [])
    const handleOpenSheet = useCallback(() => setSheetOpen(true), [])

    return (
        <div
            className="spatial-command-center"
            data-mobile-focus={mobileFocus}
            data-mobile-fab={useFAB ? 'true' : undefined}
        >
            <ThemeSync />
            <OnboardingModal />

            {/* LEFT: The Engine — hidden on mobile when using adaptive FAB */}
            {!useFAB && (
                <aside className="engine-pane">
                    <EnginePane />
                </aside>
            )}

            {/* RIGHT: The Reality */}
            <div className="reality-pane">
                <FloatingNav />

                <main className="reality-content">
                    <AnimatePresence mode="wait">
                        {viewKind === 'page' ? (
                            <motion.div
                                key="page-outlet"
                                variants={pageVariants}
                                initial="initial"
                                animate="enter"
                                exit="exit"
                                className="reality-outlet"
                            >
                                <Outlet />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="workspace-view"
                                variants={pageVariants}
                                initial="initial"
                                animate="enter"
                                exit="exit"
                                className="reality-workspace"
                            >
                                <RealityPane />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Mobile: FAB + Bottom Sheet (adaptive mode) */}
            {useFAB && (
                <>
                    <AnimatePresence>
                        {!sheetOpen && <BuggyFAB onClick={handleOpenSheet} />}
                    </AnimatePresence>
                    <BuggyBottomSheet open={sheetOpen} onClose={handleCloseSheet} />
                </>
            )}

            {/* Mobile: Back to Buggy FAB (only when sidebar mode + workspace view) */}
            {!useFAB && <BackToBuggyFAB />}
        </div>
    )
}
