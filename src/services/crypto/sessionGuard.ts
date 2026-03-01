/**
 * SessionGuard — Auto-zeroing kill-switch for the KeyVault.
 *
 * LOCKVAULT Pilar III (Volatile Memory Hygiene):
 *   - Idle timeout: locks vault after N minutes of no user activity
 *   - Background timeout: locks vault when tab is hidden for N seconds
 *   - pagehide / beforeunload: emergency sync lock on navigation/close
 *
 * The useSessionGuard() hook uses refs for all timers and throttles
 * activity events to prevent re-renders. It subscribes ONLY to
 * vault status — mousemove/keydown/touch never trigger re-renders.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useKeyVaultStore } from './keyVaultStore'

// ── Config ─────────────────────────────────────────────────────────

export interface SessionGuardConfig {
    /** Lock vault after this many ms of inactivity. Default: 5 min */
    idleTimeoutMs?: number
    /** Lock vault after tab hidden for this many ms. Default: 30 sec */
    backgroundTimeoutMs?: number
}

const DEFAULT_IDLE_MS = 5 * 60 * 1_000
const DEFAULT_BG_MS = 30 * 1_000
const ACTIVITY_THROTTLE_MS = 1_000

const ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'click',
] as const

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Mount this hook once in your app shell (e.g., inside AuthProvider).
 * It arms the kill-switch when the vault is unlocked and disarms
 * when locked. All timer logic lives in refs — zero re-render overhead.
 */
export function useSessionGuard(config?: SessionGuardConfig): void {
    const idleMs = config?.idleTimeoutMs ?? DEFAULT_IDLE_MS
    const bgMs = config?.backgroundTimeoutMs ?? DEFAULT_BG_MS

    // Subscribe only to status — stable action refs don't cause re-renders
    const status = useKeyVaultStore(s => s.status)
    const lockVault = useKeyVaultStore(s => s.lockVault)
    const emergencyLock = useKeyVaultStore(s => s.emergencyLock)
    const touchActivity = useKeyVaultStore(s => s.touchActivity)

    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastTouchTs = useRef(0)
    const hiddenAt = useRef(0)

    // ── Timer management ───────────────────────────────────────────

    const clearAllTimers = useCallback(() => {
        if (idleTimer.current) {
            clearTimeout(idleTimer.current)
            idleTimer.current = null
        }
        if (bgTimer.current) {
            clearTimeout(bgTimer.current)
            bgTimer.current = null
        }
    }, [])

    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(() => {
            void lockVault()
        }, idleMs)
    }, [idleMs, lockVault])

    // ── Throttled activity handler ─────────────────────────────────

    const handleActivity = useCallback(() => {
        const now = Date.now()
        if (now - lastTouchTs.current < ACTIVITY_THROTTLE_MS) return
        lastTouchTs.current = now
        touchActivity()
        resetIdleTimer()
    }, [touchActivity, resetIdleTimer])

    // ── Main effect ────────────────────────────────────────────────

    useEffect(() => {
        // Only arm when vault is open
        if (status !== 'unlocked') {
            clearAllTimers()
            return
        }

        // Start idle countdown
        resetIdleTimer()

        // Activity listeners — passive for zero scroll-jank
        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, handleActivity, { passive: true })
        }

        // Visibility — aggressive background timeout
        const onVisibilityChange = () => {
            if (document.hidden) {
                hiddenAt.current = Date.now()
                bgTimer.current = setTimeout(() => {
                    void lockVault()
                }, bgMs)
            } else {
                // Came back — check if we exceeded background timeout
                if (bgTimer.current) {
                    clearTimeout(bgTimer.current)
                    bgTimer.current = null
                }
                const elapsed = Date.now() - hiddenAt.current
                if (elapsed >= bgMs) {
                    void lockVault()
                } else {
                    resetIdleTimer()
                }
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        // Last-resort: synchronous emergency lock on page unload
        const onUnload = () => emergencyLock()
        window.addEventListener('pagehide', onUnload)
        window.addEventListener('beforeunload', onUnload)

        // Cleanup
        return () => {
            clearAllTimers()
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, handleActivity)
            }
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pagehide', onUnload)
            window.removeEventListener('beforeunload', onUnload)
        }
    }, [
        status,
        resetIdleTimer,
        handleActivity,
        bgMs,
        lockVault,
        emergencyLock,
        clearAllTimers,
    ])
}

// ── Defaults export for testing/config ─────────────────────────────

export const SESSION_GUARD_DEFAULTS = {
    IDLE_MS: DEFAULT_IDLE_MS,
    BACKGROUND_MS: DEFAULT_BG_MS,
    ACTIVITY_THROTTLE_MS,
} as const
