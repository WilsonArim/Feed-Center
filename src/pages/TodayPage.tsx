import { useState } from 'react'
import { NavLink } from 'react-router'
import {
    Sunrise,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    ScanLine,
    Plus,
    Repeat,
    History,
} from 'lucide-react'
import { useAutomateRecurringEntry, useAutomationHistory, useEntries, useRecurringCandidates, useUndoRecurringAutomation } from '@/hooks/useFinancial'
import { useCreateTodo, useTodos } from '@/hooks/useTodos'
import { useTopStories } from '@/hooks/useNews'
import { useMorningBriefing } from '@/hooks/useMorningBriefing'
import { useProactiveAlerts } from '@/hooks/useProactiveAlerts'
import { PageHeader, PageSectionHeader, NextActionsStrip } from '@/components/core/PagePrimitives'
import { EmptyMomentum } from '@/components/ui/EmptyMomentum'
import { useLocaleText } from '@/i18n/useLocaleText'
import { formatCurrency } from '@/utils/format'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'
import { timeAgo } from '@/services/newsService'
import type { FinancialAutomationHistoryItem, RecurringCandidate } from '@/services/financialService'

function currentMonth() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type ActionTone = 'danger' | 'warning' | 'accent'

interface ActionSuggestion {
    id: string
    title: string
    description: string
    to: string
    cta: string
    tone: ActionTone
    automate?: {
        taskTitle: string
        taskDescription: string
        priority: 'low' | 'medium' | 'high'
    }
}

function actionToneClass(tone: ActionTone) {
    if (tone === 'danger') return 'border-[var(--danger)]/30 bg-[var(--danger)]/5 shadow-[inset_0_0_15px_rgba(var(--danger-rgb),0.05)]'
    if (tone === 'warning') return 'border-[var(--warning)]/30 bg-[var(--warning)]/5 shadow-[inset_0_0_15px_rgba(var(--warning-rgb),0.05)]'
    return 'border-[var(--accent)]/30 bg-[var(--accent)]/5 shadow-[inset_0_0_15px_rgba(var(--accent-rgb),0.05)]'
}

export function TodayPage() {
    const { txt, isEnglish } = useLocaleText()
    const month = currentMonth()
    const entriesQuery = useEntries(month)
    const todosQuery = useTodos()
    const newsQuery = useTopStories(4)
    const recurringCandidatesQuery = useRecurringCandidates()
    const automationHistoryQuery = useAutomationHistory(10)
    const briefingQuery = useMorningBriefing()
    const proactiveAlertsQuery = useProactiveAlerts()
    const createTodo = useCreateTodo()
    const automateRecurring = useAutomateRecurringEntry()
    const undoRecurring = useUndoRecurringAutomation()
    const [actionState, setActionState] = useState<Record<string, 'idle' | 'pending' | 'done' | 'exists' | 'error'>>({})
    const [recurringState, setRecurringState] = useState<Record<string, 'idle' | 'pending' | 'done' | 'error'>>({})
    const [undoState, setUndoState] = useState<Record<string, 'idle' | 'pending' | 'done' | 'error'>>({})

    const todayIso = new Date().toISOString().slice(0, 10)
    const entriesToday = (entriesQuery.data ?? []).filter((entry) => entry.date === todayIso)
    const moneyInToday = entriesToday
        .filter((entry) => entry.type === 'income')
        .reduce((sum, entry) => sum + Number(entry.amount), 0)
    const moneyOutToday = entriesToday
        .filter((entry) => entry.type === 'expense' || entry.type === 'bill')
        .reduce((sum, entry) => sum + Number(entry.amount), 0)

    const pendingTodos = (todosQuery.data ?? []).filter((todo) => todo.status !== 'done')
    const highPriority = pendingTodos.filter((todo) => todo.priority === 'high')
    const dueToday = pendingTodos.filter((todo) => (todo.due_date ?? '').startsWith(todayIso))
    const actionNow = highPriority.length + dueToday.length

    const recommendations: ActionSuggestion[] = []
    if (highPriority.length > 0) {
        recommendations.push({
            id: 'high-priority',
            title: txt('Fecha tarefas criticas primeiro', 'Close critical tasks first'),
            description: txt('Existem tarefas de alta prioridade abertas. Resolve-as antes de tudo.', 'You have high-priority tasks open. Resolve them first.'),
            to: '/todo',
            cta: txt('Abrir tarefas', 'Open tasks'),
            tone: 'danger',
        })
    }
    if (entriesToday.length === 0) {
        recommendations.push({
            id: 'no-cash-log',
            title: txt('Regista o primeiro movimento de hoje', 'Log your first transaction today'),
            description: txt('Sem registos de hoje, perdes visibilidade de caixa em tempo real.', 'Without today entries, you lose real-time cash visibility.'),
            to: '/financeiro',
            cta: txt('Registar agora', 'Log now'),
            tone: 'warning',
            automate: {
                taskTitle: txt('Registar movimentos financeiros de hoje', 'Log today financial transactions'),
                taskDescription: txt(
                    'Completa o registo de entradas e despesas de hoje para manter a leitura de caixa atualizada.',
                    'Complete today income and expense logs to keep cash visibility updated.',
                ),
                priority: 'high',
            },
        })
    }
    if (moneyOutToday > moneyInToday && moneyOutToday > 0) {
        recommendations.push({
            id: 'out-above-in',
            title: txt('Saidas de hoje acima das entradas', 'Today outflow is above inflow'),
            description: txt('Revê as despesas de hoje e cria follow-ups para reduzir fuga de caixa.', 'Review today spending and create follow-ups to reduce cash leakage.'),
            to: '/financeiro',
            cta: txt('Rever despesas', 'Review spending'),
            tone: 'warning',
            automate: {
                taskTitle: txt('Rever despesas acima de receitas (hoje)', 'Review spending above income (today)'),
                taskDescription: txt(
                    'Identifica as 2 maiores saídas e define uma ação concreta para reduzir impacto ainda hoje.',
                    'Identify the top 2 outflows and define one concrete action to reduce impact today.',
                ),
                priority: 'medium',
            },
        })
    }
    if ((newsQuery.data?.length ?? 0) > 0) {
        recommendations.push({
            id: 'news-context',
            title: txt('Atualiza contexto de decisao', 'Refresh decision context'),
            description: txt('Tens noticias novas. Converte sinais relevantes em tarefas executaveis.', 'You have fresh news. Convert relevant signals into executable tasks.'),
            to: '/news',
            cta: txt('Abrir noticias', 'Open news'),
            tone: 'accent',
            automate: {
                taskTitle: txt('Extrair 1 ação das notícias de hoje', 'Extract 1 action from today news'),
                taskDescription: txt(
                    'Lê as principais notícias e transforma pelo menos 1 insight em tarefa com prazo.',
                    'Read top news and convert at least 1 insight into a task with due date.',
                ),
                priority: 'medium',
            },
        })
    }

    const handleExecuteAction = async (item: ActionSuggestion) => {
        if (!item.automate) return

        const status = actionState[item.id] ?? 'idle'
        if (status === 'pending') return

        const titleNormalized = item.automate.taskTitle.trim().toLowerCase()
        const existing = (todosQuery.data ?? []).some((todo) => (
            todo.status !== 'done'
            && todo.title.trim().toLowerCase() === titleNormalized
        ))
        if (existing) {
            setActionState((prev) => ({ ...prev, [item.id]: 'exists' }))
            return
        }

        setActionState((prev) => ({ ...prev, [item.id]: 'pending' }))
        try {
            await createTodo.mutateAsync({
                title: item.automate.taskTitle,
                description: item.automate.taskDescription,
                status: 'todo',
                priority: item.automate.priority,
                due_date: todayIso,
            })
            setActionState((prev) => ({ ...prev, [item.id]: 'done' }))
        } catch {
            setActionState((prev) => ({ ...prev, [item.id]: 'error' }))
        }
    }

    const handleAutomateRecurring = async (candidate: RecurringCandidate) => {
        const current = recurringState[candidate.latestEntryId] ?? 'idle'
        if (current === 'pending') return

        setRecurringState((prev) => ({ ...prev, [candidate.latestEntryId]: 'pending' }))
        try {
            await automateRecurring.mutateAsync(candidate.latestEntryId)
            setRecurringState((prev) => ({ ...prev, [candidate.latestEntryId]: 'done' }))
        } catch {
            setRecurringState((prev) => ({ ...prev, [candidate.latestEntryId]: 'error' }))
        }
    }

    const handleUndoAutomation = async (event: FinancialAutomationHistoryItem) => {
        const current = undoState[event.id] ?? 'idle'
        if (current === 'pending') return
        setUndoState((prev) => ({ ...prev, [event.id]: 'pending' }))
        try {
            await undoRecurring.mutateAsync(event.id)
            setUndoState((prev) => ({ ...prev, [event.id]: 'done' }))
        } catch {
            setUndoState((prev) => ({ ...prev, [event.id]: 'error' }))
        }
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-[var(--dock-clearance)] space-y-8">
            <PageHeader
                icon={<Sunrise size={18} />}
                title={txt('Hoje', 'Today')}
                subtitle={txt(
                    'Ritual diario: responde em segundos o que entrou, saiu e o que exige acao agora.',
                    'Daily ritual: answer in seconds what came in, went out, and what needs action now.',
                )}
                actions={(
                    <>
                        <NavLink
                            to="/financeiro"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors text-sm"
                        >
                            <ScanLine size={14} />
                            {txt('Digitalizar talao', 'Scan receipt')}
                        </NavLink>
                        <NavLink
                            to="/todo"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-opacity text-sm font-semibold"
                        >
                            <Plus size={14} />
                            {txt('Nova tarefa', 'New task')}
                        </NavLink>
                    </>
                )}
            />

            {briefingQuery.data && (
                <div className="rounded-3xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-5 py-4 mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                                {txt('Briefing automático', 'Automatic briefing')} • {briefingQuery.data.briefingDate}
                            </p>
                            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                                {briefingQuery.data.topPriorities[0]?.title ?? txt('Sem prioridades críticas', 'No critical priorities')}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                {briefingQuery.data.topPriorities[0]?.description ?? txt('Sistema estável para hoje.', 'System stable for today.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                            <span>{txt('Atrasos', 'Overdue')}: <strong className="text-white">{briefingQuery.data.overdueTasks}</strong></span>
                            <span>{txt('Handshakes', 'Handshakes')}: <strong className="text-white">{briefingQuery.data.pendingHandshakes}</strong></span>
                            <span>{txt('Alertas', 'Alerts')}: <strong className="text-white">{proactiveAlertsQuery.data?.length ?? 0}</strong></span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pt-4 pb-8 border-b border-white/5">
                <div className="flex flex-col gap-1 transition-all group">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-sm">{txt('Entrou hoje', 'In today')}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight drop-shadow-md text-[var(--success)] tabular-nums">+{formatCurrency(moneyInToday)}</p>
                </div>
                <div className="flex flex-col gap-1 transition-all group">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-sm">{txt('Saiu hoje', 'Out today')}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight drop-shadow-md text-[var(--danger)] tabular-nums">-{formatCurrency(moneyOutToday)}</p>
                </div>
                <div className="flex flex-col gap-1 transition-all group">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-sm">{txt('Exige acao agora', 'Needs action now')}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight drop-shadow-md text-white tabular-nums">{actionNow}</p>
                </div>
            </div>

            <PageSectionHeader
                title={txt('Fila de acao', 'Action queue')}
                subtitle={txt('Decisoes recomendadas para manter o loop de execucao fechado.', 'Recommended decisions to keep the execution loop closed.')}
            />

            <div className="space-y-4 mb-12">
                {recommendations.length === 0 ? (
                    <EmptyMomentum
                        icon={<CheckCircle2 size={18} />}
                        title={txt('Tudo sob controlo', 'Everything under control')}
                        message={txt('Nao existem alertas criticos por agora. Mantem o ritmo e fecha pendencias pequenas.', 'No critical alerts right now. Keep momentum and close small pending items.')}
                        compact
                    />
                ) : (
                    recommendations.map((item) => (
                        <div key={item.id} className={`rounded-3xl border px-6 py-5 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] ${actionToneClass(item.tone)}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                                    <p className="text-xs mt-1 text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
                                </div>
                                <AlertTriangle size={14} className="shrink-0 text-[var(--text-tertiary)]" />
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                {item.automate && (
                                    <button
                                        type="button"
                                        onClick={() => { void handleExecuteAction(item) }}
                                        disabled={(actionState[item.id] ?? 'idle') === 'pending'}
                                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {txt('Executar agora', 'Run now')}
                                    </button>
                                )}
                                <NavLink
                                    to={item.to}
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors"
                                >
                                    {item.cta}
                                    <ArrowRight size={11} />
                                </NavLink>
                            </div>
                            {item.automate && (
                                <p className="text-[11px] mt-2 text-[var(--text-tertiary)]">
                                    {(actionState[item.id] ?? 'idle') === 'pending' && txt('A executar ação...', 'Running action...')}
                                    {(actionState[item.id] ?? 'idle') === 'done' && txt('Ação executada: tarefa criada.', 'Action executed: task created.')}
                                    {(actionState[item.id] ?? 'idle') === 'exists' && txt('Já existe tarefa ativa para esta ação.', 'An active task for this action already exists.')}
                                    {(actionState[item.id] ?? 'idle') === 'error' && txt('Falha ao executar. Tenta novamente.', 'Execution failed. Please try again.')}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            <PageSectionHeader
                title={txt('Automação recomendada', 'Recommended automation')}
                subtitle={txt(
                    'Detetámos padrões de despesa com sinal de recorrência. Um clique ativa alerta e repetição mensal.',
                    'We detected spending patterns with recurring signal. One click enables monthly recurrence and alerts.',
                )}
            />
            <div className="space-y-4 mb-12">
                {recurringCandidatesQuery.isLoading ? (
                    <div className="space-y-2.5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
                        ))}
                    </div>
                ) : (recurringCandidatesQuery.data?.length ?? 0) === 0 ? (
                    <EmptyMomentum
                        icon={<Repeat size={18} />}
                        title={txt('Sem automações críticas por agora', 'No critical automations right now')}
                        message={txt('Quando existir padrão recorrente claro, vais ver a sugestão aqui.', 'When a clear recurring pattern appears, you will see the suggestion here.')}
                        compact
                    />
                ) : (
                    recurringCandidatesQuery.data?.map((candidate) => {
                        const state = recurringState[candidate.latestEntryId] ?? 'idle'
                        return (
                            <div
                                key={candidate.key}
                                className="rounded-3xl border border-white/5 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] px-6 py-5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                            {candidate.merchant}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            {localizeFinancialCategory(candidate.category, isEnglish)} • {txt('média', 'avg')}: {formatCurrency(candidate.suggestedAmount)} • {candidate.monthsCovered} {txt('meses', 'months')} • {candidate.occurrences} {txt('registos', 'records')}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                                            {txt('Confiança', 'Confidence')}: {Math.round(candidate.confidence * 100)}% • {txt('dia sugerido', 'suggested day')}: {candidate.recurringDay}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { void handleAutomateRecurring(candidate) }}
                                            disabled={state === 'pending'}
                                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            <Repeat size={12} />
                                            {txt('Automatizar', 'Automate')}
                                        </button>
                                        <NavLink
                                            to="/financeiro"
                                            className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                                        >
                                            {txt('Ver no financeiro', 'View in finance')}
                                            <ArrowRight size={11} />
                                        </NavLink>
                                    </div>
                                </div>
                                <p className="text-[11px] mt-2 text-[var(--text-tertiary)]">
                                    {state === 'pending' && txt('A automatizar despesa fixa...', 'Automating fixed expense...')}
                                    {state === 'done' && txt('Automação ativa: marcado como recorrente mensal com alerta.', 'Automation active: marked as monthly recurring with alert.')}
                                    {state === 'error' && txt('Falha ao automatizar. Tenta novamente.', 'Automation failed. Please try again.')}
                                </p>
                            </div>
                        )
                    })
                )}
            </div>

            <PageSectionHeader
                title={txt('Histórico de automação', 'Automation history')}
                subtitle={txt(
                    'Cada automação fica registada com possibilidade de reversão para máxima transparência.',
                    'Every automation is logged with reversal capability for maximum transparency.',
                )}
            />
            <div className="space-y-4 mb-12">
                {automationHistoryQuery.isLoading ? (
                    <div className="space-y-2.5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
                        ))}
                    </div>
                ) : (automationHistoryQuery.data?.length ?? 0) === 0 ? (
                    <EmptyMomentum
                        icon={<History size={18} />}
                        title={txt('Sem histórico ainda', 'No history yet')}
                        message={txt('As automações e reversões vão aparecer aqui.', 'Automations and reversals will appear here.')}
                        compact
                    />
                ) : (
                    automationHistoryQuery.data?.map((event) => {
                        const canUndo = event.action === 'automate_recurring' && !event.revertedAt
                        const undoStatus = undoState[event.id] ?? 'idle'
                        const actionLabel = event.action === 'automate_recurring'
                            ? txt('Automação recorrente', 'Recurring automation')
                            : event.action === 'undo_automate_recurring'
                                ? txt('Reversão de automação', 'Automation undo')
                                : txt('Handshake OCR', 'OCR handshake')
                        return (
                            <div
                                key={event.id}
                                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-3"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                            {event.entryLabel || txt('Movimento financeiro', 'Financial transaction')}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            {actionLabel} • {new Date(event.createdAt).toLocaleString(isEnglish ? 'en-US' : 'pt-PT')}
                                        </p>
                                        {event.reason && (
                                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{event.reason}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canUndo && (
                                            <button
                                                type="button"
                                                onClick={() => { void handleUndoAutomation(event) }}
                                                disabled={undoStatus === 'pending'}
                                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)]/45 hover:text-[var(--danger)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {txt('Desfazer', 'Undo')}
                                            </button>
                                        )}
                                        {!canUndo && event.revertedAt && (
                                            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                                                {txt('Revertido', 'Reverted')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {canUndo && (
                                    <p className="text-[11px] mt-2 text-[var(--text-tertiary)]">
                                        {undoStatus === 'pending' && txt('A desfazer automação...', 'Undoing automation...')}
                                        {undoStatus === 'done' && txt('Automação desfeita com sucesso.', 'Automation successfully undone.')}
                                        {undoStatus === 'error' && txt('Falha ao desfazer. Tenta novamente.', 'Undo failed. Please try again.')}
                                    </p>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-white/5 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {txt('Movimentos de hoje', 'Today transactions')}
                        </h3>
                        <NavLink
                            to="/financeiro"
                            className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                        >
                            {txt('Abrir financeiro', 'Open finance')}
                            <ArrowRight size={11} />
                        </NavLink>
                    </div>

                    {entriesQuery.isLoading ? (
                        <div className="p-5 space-y-2.5">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-11 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
                            ))}
                        </div>
                    ) : entriesToday.length === 0 ? (
                        <div className="px-5 py-5 text-center">
                            <p className="text-sm font-heading font-bold text-[var(--text-secondary)]">
                                {txt('Ainda sem movimentos hoje', 'No transactions yet today')}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                {txt('Regista a primeira despesa do dia.', 'Record your first expense of the day.')}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-subtle)]">
                            {entriesToday.slice(0, 6).map((entry) => {
                                const isOut = entry.type === 'expense' || entry.type === 'bill'
                                const localizedCategory = localizeFinancialCategory(entry.category, isEnglish)
                                return (
                                    <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-[var(--text-primary)] truncate">{entry.description || localizedCategory}</p>
                                            <p className="text-xs text-[var(--text-tertiary)] truncate">
                                                {localizedCategory} {entry.receipt_merchant ? `• ${entry.receipt_merchant}` : ''}
                                            </p>
                                        </div>
                                        <p className={`text-sm font-semibold tabular-nums ${isOut ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                                            {isOut ? '-' : '+'}{formatCurrency(entry.amount)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {txt('Foco de execucao', 'Execution focus')}
                        </h3>
                        <NavLink
                            to="/todo"
                            className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                        >
                            {txt('Abrir tarefas', 'Open tasks')}
                            <ArrowRight size={11} />
                        </NavLink>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{txt('Tarefas criticas', 'Critical tasks')}</p>
                            {todosQuery.isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-9 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
                                    ))}
                                </div>
                            ) : highPriority.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] font-heading font-bold">{txt('Sem tarefas criticas abertas.', 'No critical tasks open.')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {highPriority.slice(0, 4).map((todo) => (
                                        <div key={todo.id} className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-2.5">
                                            <p className="text-sm text-[var(--text-primary)] truncate">{todo.title}</p>
                                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                                {todo.due_date
                                                    ? `${txt('Prazo', 'Due')}: ${new Date(todo.due_date).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT')}`
                                                    : txt('Sem prazo definido', 'No due date set')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{txt('Radar rapido', 'Quick radar')}</p>
                            {newsQuery.isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="h-9 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
                                    ))}
                                </div>
                            ) : (newsQuery.data?.length ?? 0) === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] font-heading font-bold">{txt('Sem noticias novas agora.', 'No fresh news right now.')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {newsQuery.data?.slice(0, 2).map((item) => (
                                        <a
                                            key={item.id}
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 hover:border-[var(--accent)]/30 transition-colors"
                                        >
                                            <p className="text-sm text-[var(--text-primary)] line-clamp-1">{item.title}</p>
                                            <p className="text-xs text-[var(--text-tertiary)] mt-1">{timeAgo(item.published_at)}</p>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <NextActionsStrip
                title={txt('Mantem o ritual diario: fecha 1 tarefa critica e regista todos os movimentos do dia.', 'Keep the daily ritual: close 1 critical task and log every transaction today.')}
                actions={[
                    { label: txt('Ir para tarefas', 'Go to tasks'), to: '/todo' },
                    { label: txt('Ir para financeiro', 'Go to finance'), to: '/financeiro' },
                    { label: txt('Ver noticias', 'View news'), to: '/news' },
                ]}
            />
        </div>
    )
}
