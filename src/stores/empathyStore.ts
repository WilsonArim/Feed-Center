import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { useSerafimStore } from '@/stores/serafimStore'

/* ── Types ── */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type ActivityLevel = 'calm' | 'active' | 'overwhelmed'
export type FinancialMood = 'positive' | 'neutral' | 'stressed'

export interface EmpathyState {
    timeOfDay: TimeOfDay
    activityLevel: ActivityLevel
    financialMood: FinancialMood
    streak: number
}

interface EmpathyStore extends EmpathyState {
    /** Re-compute empathy from raw signals. Call this from DashboardPage. */
    compute: (signals: EmpathySignals) => void
}

export interface EmpathySignals {
    pendingTasks: number
    highPriorityTasks: number
    unreadAlerts: number
    budgetUsagePct: number // 0-100+ — expenses / income * 100
    consecutiveDaysWithEntry: number
}

/* ── Pure helpers ── */

function deriveTimeOfDay(): TimeOfDay {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'morning'
    if (h >= 12 && h < 18) return 'afternoon'
    if (h >= 18 && h < 22) return 'evening'
    return 'night'
}

function deriveActivityLevel(pending: number, highPriority: number, alerts: number): ActivityLevel {
    const pressure = pending + alerts + highPriority * 2
    if (pressure > 8) return 'overwhelmed'
    if (pressure >= 3) return 'active'
    return 'calm'
}

function deriveFinancialMood(budgetPct: number): FinancialMood {
    if (budgetPct < 70) return 'positive'
    if (budgetPct <= 90) return 'neutral'
    return 'stressed'
}

/* ── Store ── */

export const useEmpathyStore = create<EmpathyStore>((set, get) => ({
    timeOfDay: deriveTimeOfDay(),
    activityLevel: 'calm',
    financialMood: 'neutral',
    streak: 0,

    compute: (signals) => {
        const timeOfDay = deriveTimeOfDay()
        const activityLevel = deriveActivityLevel(signals.pendingTasks, signals.highPriorityTasks, signals.unreadAlerts)
        const financialMood = deriveFinancialMood(signals.budgetUsagePct)
        const streak = signals.consecutiveDaysWithEntry

        const prev = get()
        const changed =
            prev.timeOfDay !== timeOfDay ||
            prev.activityLevel !== activityLevel ||
            prev.financialMood !== financialMood ||
            prev.streak !== streak

        if (!changed) return

        set({ timeOfDay, activityLevel, financialMood, streak })

        // Wire serafimStore emotions
        const serafim = useSerafimStore.getState()
        if (activityLevel === 'overwhelmed') {
            serafim.triggerWorried(5000)
        } else if (streak > 3 && activityLevel === 'calm') {
            serafim.triggerHappy(4000)
        }
    },
}))

/* ── Convenience hook ── */
export function useEmpathyState(): EmpathyState {
    return useEmpathyStore(useShallow((s) => ({
        timeOfDay: s.timeOfDay,
        activityLevel: s.activityLevel,
        financialMood: s.financialMood,
        streak: s.streak,
    })))
}

/* ── Ambient CSS variable injection ── */

const AMBIENT_MAP: Record<TimeOfDay, string> = {
    morning: 'rgba(255, 160, 60, 0.08)',
    afternoon: 'rgba(255, 255, 255, 0.03)',
    evening: 'rgba(100, 140, 255, 0.06)',
    night: 'rgba(60, 80, 180, 0.08)',
}

const GLOW_MAP: Record<TimeOfDay, string> = {
    morning: '0 0 120px 40px rgba(255, 160, 60, 0.04)',
    afternoon: 'none',
    evening: '0 0 120px 40px rgba(100, 140, 255, 0.03)',
    night: '0 0 120px 40px rgba(60, 80, 180, 0.04)',
}

const DENSITY_MAP: Record<ActivityLevel, string> = {
    calm: 'comfortable',
    active: 'comfortable',
    overwhelmed: 'compact',
}

export function applyAmbientCSS(state: EmpathyState) {
    const root = document.documentElement.style
    root.setProperty('--ambient-tint', AMBIENT_MAP[state.timeOfDay])
    root.setProperty('--ambient-glow', GLOW_MAP[state.timeOfDay])
    root.setProperty('--ambient-density', DENSITY_MAP[state.activityLevel])
}
