/**
 * Night Shift Worker — Law 3: Proactive Serendipity
 *
 * The 4 AM cognitive loop. While the user sleeps, Buggy cross-references
 * tomorrow's schedule, current budget, historical routines, and pending
 * handshakes to pre-compute actionable strategies.
 *
 * Output: StrategicBriefing stored in SubconsciousLedger (daily_briefings).
 * This replaces the generic morning briefing with cross-domain intelligence.
 */

import { Worker, type Job } from 'bullmq'
import { env, supabase } from '../config.js'
import {
    NIGHT_SHIFT_QUEUE_NAME,
    nightShiftQueue,
    type NightShiftJobPayload,
} from '../queues/nightShiftQueue.js'
import { cortexRouter } from '../services/cortex/cortexRouter.js'

interface StrategicInsight {
    domain: 'finance' | 'tasks' | 'routines' | 'cross_domain'
    priority: 'critical' | 'high' | 'medium' | 'info'
    title: string
    body: string
    actionable: boolean
    data: Record<string, unknown>
}

interface NightShiftResult {
    usersProcessed: number
    insightsGenerated: number
}

function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10)
}

async function processNightShift(job: Job<NightShiftJobPayload>): Promise<NightShiftResult> {
    const specificUserId = job.data.userId?.trim() || null
    const users = specificUserId
        ? [specificUserId]
        : await resolveAllUsers()

    let totalInsights = 0

    for (const userId of users) {
        const insights = await generateStrategicBriefing(userId)
        totalInsights += insights.length

        const now = new Date()
        const briefingDate = toIsoDate(now)
        const expiresAt = `${briefingDate}T23:59:59.999Z`

        // Augment existing briefing with strategic insights
        const baseBriefing = await cortexRouter.getTodayBriefing(userId, {
            forceRefresh: true,
            briefingDate,
        })

        // Store enriched briefing
        const enrichedPayload = {
            ...baseBriefing,
            strategicInsights: insights,
            nightShiftRanAt: now.toISOString(),
        }

        cortexRouter['ledger'].putDailyBriefing({
            userId,
            briefingDate,
            generatedAt: now.toISOString(),
            expiresAt,
            payload: enrichedPayload as unknown as typeof baseBriefing,
        })

        console.log(`[NightShift] ${userId}: ${insights.length} strategic insights generated`)
    }

    return { usersProcessed: users.length, insightsGenerated: totalInsights }
}

// ── Strategic Analysis ─────────────────────────────────────────────

async function generateStrategicBriefing(userId: string): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = []
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 86_400_000)
    const tomorrowStr = toIsoDate(tomorrow)
    const todayStr = toIsoDate(now)

    // ── 1. Tomorrow's task load ────────────────────────────────────

    const { data: tomorrowTasks } = await supabase
        .from('todos')
        .select('id, title, priority, due_date, status')
        .eq('user_id', userId)
        .neq('status', 'done')
        .lte('due_date', `${tomorrowStr}T23:59:59.999Z`)

    if (tomorrowTasks && tomorrowTasks.length > 0) {
        const critical = tomorrowTasks.filter((t) => t.priority === 'high')
        const overdue = tomorrowTasks.filter((t) =>
            t.due_date && new Date(t.due_date).getTime() < now.getTime(),
        )

        if (overdue.length > 0) {
            insights.push({
                domain: 'tasks',
                priority: 'critical',
                title: `${overdue.length} tarefa(s) já em atraso`,
                body: `Tarefas: ${overdue.map((t) => t.title).slice(0, 3).join(', ')}. Resolve antes de começar o dia.`,
                actionable: true,
                data: { overdue_ids: overdue.map((t) => t.id), count: overdue.length },
            })
        }

        if (critical.length > 0 && critical.length !== overdue.length) {
            insights.push({
                domain: 'tasks',
                priority: 'high',
                title: `${critical.length} tarefa(s) de alta prioridade para amanhã`,
                body: `Foco em: ${critical.map((t) => t.title).slice(0, 3).join(', ')}.`,
                actionable: true,
                data: { critical_ids: critical.map((t) => t.id) },
            })
        }
    }

    // ── 2. Spending trajectory ─────────────────────────────────────

    const monthStart = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))

    const { data: monthExpenses } = await supabase
        .from('financial_entries')
        .select('amount, category, date')
        .eq('user_id', userId)
        .in('type', ['expense', 'bill'])
        .gte('date', monthStart)
        .lte('date', todayStr)

    if (monthExpenses && monthExpenses.length > 0) {
        const totalSpent = monthExpenses.reduce((s, r) => s + Number(r.amount), 0)
        const dayOfMonth = now.getDate()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const projectedMonthly = (totalSpent / dayOfMonth) * daysInMonth

        // Category breakdown
        const byCat = new Map<string, number>()
        for (const row of monthExpenses) {
            const cat = String(row.category ?? 'Outros')
            byCat.set(cat, (byCat.get(cat) ?? 0) + Number(row.amount))
        }

        const topCategory = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]

        if (topCategory) {
            insights.push({
                domain: 'finance',
                priority: 'medium',
                title: `Maior categoria: ${topCategory[0]} (${topCategory[1].toFixed(0)}€)`,
                body: `Projeção mensal: ${projectedMonthly.toFixed(0)}€. A manter este ritmo, faltam ${(projectedMonthly - totalSpent).toFixed(0)}€ até ao fim do mês.`,
                actionable: false,
                data: {
                    total_spent: Number(totalSpent.toFixed(2)),
                    projected_monthly: Number(projectedMonthly.toFixed(2)),
                    top_category: topCategory[0],
                    top_amount: Number(topCategory[1].toFixed(2)),
                    day_of_month: dayOfMonth,
                },
            })
        }

        // Savings opportunity detection
        const dailyAvg = totalSpent / dayOfMonth
        if (dailyAvg > 0) {
            const weekdaySpend = monthExpenses
                .filter((r) => {
                    const d = new Date(r.date)
                    return d.getDay() >= 1 && d.getDay() <= 5
                })
                .reduce((s, r) => s + Number(r.amount), 0)

            const weekendSpend = totalSpent - weekdaySpend
            const weekendDays = monthExpenses.filter((r) => {
                const d = new Date(r.date)
                return d.getDay() === 0 || d.getDay() === 6
            }).length || 1

            const weekdayDays = dayOfMonth - weekendDays
            const weekdayAvg = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0
            const weekendAvg = weekendSpend / weekendDays

            if (weekendAvg > weekdayAvg * 1.4) {
                insights.push({
                    domain: 'finance',
                    priority: 'info',
                    title: 'Gastas mais ao fim de semana',
                    body: `Média diária semana: ${weekdayAvg.toFixed(0)}€ vs fim-de-semana: ${weekendAvg.toFixed(0)}€. Uma redução de 20% aos fins-de-semana pouparia ~${((weekendAvg - weekdayAvg) * 0.2 * 8).toFixed(0)}€/mês.`,
                    actionable: true,
                    data: { weekday_avg: weekdayAvg, weekend_avg: weekendAvg },
                })
            }
        }
    }

    // ── 3. Routine predictions ─────────────────────────────────────

    const routines = cortexRouter.profile.get('routine_patterns')
    if (routines && typeof routines === 'object') {
        const entries = Object.entries(routines).filter(([key]) => key !== 'value')

        for (const [merchant, data] of entries) {
            const d = data as { period_days?: number; last_occurrence?: string; count?: number }
            if (!d.period_days || !d.last_occurrence) continue

            const lastDate = new Date(d.last_occurrence)
            const nextExpected = new Date(lastDate.getTime() + d.period_days * 86_400_000)
            const daysUntilNext = (nextExpected.getTime() - now.getTime()) / 86_400_000

            if (daysUntilNext >= 0 && daysUntilNext <= 2) {
                insights.push({
                    domain: 'routines',
                    priority: 'info',
                    title: `${merchant} previsto nos próximos ${Math.ceil(daysUntilNext)} dia(s)`,
                    body: `Padrão: cada ~${d.period_days} dias (${d.count ?? '?'} ocorrências). Prepare o budget.`,
                    actionable: false,
                    data: { merchant, period_days: d.period_days, days_until: Math.ceil(daysUntilNext) },
                })
            }
        }
    }

    // ── 4. Cross-domain synthesis ──────────────────────────────────

    const pendingHandshakes = cortexRouter['ledger'].getPendingHandshakes(32)
    if (pendingHandshakes.length >= 3) {
        insights.push({
            domain: 'cross_domain',
            priority: 'high',
            title: `${pendingHandshakes.length} handshakes pendentes acumulados`,
            body: 'Confirma ou rejeita os drafts para manter a cognição limpa. Handshakes antigos degradam a precisão do Buggy.',
            actionable: true,
            data: { count: pendingHandshakes.length },
        })
    }

    // Sort: critical > high > medium > info
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 }
    insights.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))

    return insights
}

// ── User resolution ────────────────────────────────────────────────

async function resolveAllUsers(): Promise<string[]> {
    const [todoUsers, finUsers] = await Promise.all([
        supabase.from('todos').select('user_id'),
        supabase.from('financial_entries').select('user_id'),
    ])

    const users = new Set<string>()
    for (const row of todoUsers.data ?? []) {
        const id = (row as { user_id?: string }).user_id?.trim()
        if (id) users.add(id)
    }
    for (const row of finUsers.data ?? []) {
        const id = (row as { user_id?: string }).user_id?.trim()
        if (id) users.add(id)
    }
    return Array.from(users)
}

// ── Worker ─────────────────────────────────────────────────────────

const worker = new Worker<NightShiftJobPayload, NightShiftResult>(
    NIGHT_SHIFT_QUEUE_NAME,
    processNightShift,
    {
        connection: { url: env.redisUrl },
        concurrency: 1,
    },
)

worker.on('ready', () => {
    console.log('🌙 Night Shift worker ready')
})

worker.on('completed', (job) => {
    console.log(`🌙 Night Shift job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
    console.error(`🌙 Night Shift job ${job?.id} failed:`, error.message)
})

async function ensureNightShiftSchedule(): Promise<void> {
    await nightShiftQueue.add(
        'night-shift',
        { reason: 'scheduled' },
        {
            jobId: 'night-shift@04',
            repeat: {
                pattern: env.nightShiftCron,
                tz: env.nightShiftTimezone,
            },
        },
    )
}

void ensureNightShiftSchedule().catch((error) => {
    console.error('🌙 Failed to schedule Night Shift repeat job:', error)
})

export { worker as nightShiftWorker }
