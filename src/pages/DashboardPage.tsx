import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { NavLink } from 'react-router'
import {
    DollarSign, CheckSquare, Link2, Bitcoin, ArrowRight,
    Newspaper, TrendingUp, TrendingDown, AlertCircle,
    Clock, ExternalLink, CheckCircle2, Plus, Zap, Target,
    GripVertical, RotateCcw,
} from 'lucide-react'
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext, verticalListSortingStrategy,
    useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useEntries, useMonthSummary } from '@/hooks/useFinancial'
import { useTodos } from '@/hooks/useTodos'
import { useWeb3 } from '@/hooks/useWeb3'
import { useLinks } from '@/hooks/useLinks'
import { useTopStories } from '@/hooks/useNews'
import { useProactiveAlerts } from '@/hooks/useProactiveAlerts'
import { timeAgo } from '@/services/newsService'
import { formatCurrency } from '@/utils/format'
import { NextActionsStrip } from '@/components/core/PagePrimitives'
import { EmptyMomentum } from '@/components/ui/EmptyMomentum'
import { useLocaleText } from '@/i18n/useLocaleText'
import { SpatialPlate } from '@/components/ui/SpatialPlate'
import { Magnetic } from '@/components/ui/Magnetic'
import { useSpatialStore } from '@/stores/useSpatialStore'
import { useEmpathyStore, useEmpathyState, applyAmbientCSS, type EmpathyState } from '@/stores/empathyStore'

/* ============================================================
   WIDGET ID SYSTEM
   ============================================================ */
type WidgetId = 'mission' | 'financial' | 'nuclear' | 'modules' | 'news'

const STORAGE_KEY = 'fc-dashboard-order'

function getStoredOrder(): WidgetId[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as WidgetId[]
    } catch {
        return null
    }
}

function persistOrder(order: WidgetId[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    } catch { /* noop */ }
}

function clearStoredOrder() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch { /* noop */ }
}

/** Derive default widget order from empathy state */
function empathyOrder(state: EmpathyState): WidgetId[] {
    const { timeOfDay, activityLevel } = state

    if (activityLevel === 'overwhelmed') {
        return ['mission', 'modules', 'nuclear', 'financial', 'news']
    }

    if (timeOfDay === 'morning' && activityLevel === 'calm') {
        return ['financial', 'mission', 'nuclear', 'modules', 'news']
    }

    if (timeOfDay === 'evening' || timeOfDay === 'night') {
        return ['news', 'financial', 'mission', 'nuclear', 'modules']
    }

    // Default: balanced
    return ['mission', 'financial', 'nuclear', 'modules', 'news']
}

/* ============================================================
   ANIMATION VARIANTS
   ============================================================ */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function getGreeting(isEnglish: boolean) {
    const h = new Date().getHours()
    if (h < 12) return isEnglish ? 'Good morning' : 'Bom dia'
    if (h < 18) return isEnglish ? 'Good afternoon' : 'Boa tarde'
    return isEnglish ? 'Good evening' : 'Boa noite'
}

/* ============================================================
   SORTABLE WIDGET WRAPPER
   ============================================================ */
function SortableWidget({ id, children }: { id: WidgetId; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative' as const,
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layout
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={isDragging ? 'opacity-90 scale-[1.01]' : ''}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="absolute -left-1 top-4 z-40 w-7 h-7 rounded-lg flex items-center justify-center
                    text-[var(--text-tertiary)] hover:text-white hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing
                    opacity-0 group-hover/dashboard:opacity-100 md:opacity-0 md:hover:opacity-100"
                aria-label="Drag to reorder"
            >
                <GripVertical size={14} />
            </button>
            {children}
        </motion.div>
    )
}

/* ============================================================
   PROACTIVE ALERTS STRIP
   ============================================================ */
function ProactiveAlertStrip() {
    const alertsQuery = useProactiveAlerts()
    const alerts = alertsQuery.data ?? []

    if (alerts.length === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-5xl mb-6"
            >
                <div className="flex flex-wrap gap-2">
                    {alerts.slice(0, 3).map((alert: any, i: number) => (
                        <motion.div
                            key={alert.id || i}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
                                bg-[var(--accent)]/8 border border-[var(--accent)]/20
                                text-sm text-[var(--text-primary)]"
                        >
                            <Zap size={14} className="text-[var(--accent)] shrink-0" />
                            <span className="line-clamp-1">{alert.message || alert.title}</span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

/* ============================================================
   TODAY PULSE CARD
   ============================================================ */
function TodayPulseCard({
    moneyIn, moneyOut, actionNow,
}: {
    moneyIn: number; moneyOut: number; actionNow: number
}) {
    const { txt } = useLocaleText()
    return (
        <SpatialPlate className="p-4 md:p-5 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{txt('Entrou hoje', 'In today')}</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--success)] tabular-nums">+{formatCurrency(moneyIn)}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{txt('Saiu hoje', 'Out today')}</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--danger)] tabular-nums">-{formatCurrency(moneyOut)}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{txt('Exige ação agora', 'Needs action now')}</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">{actionNow}</p>
                </div>
            </div>
        </SpatialPlate>
    )
}

/* ============================================================
   MISSION CARD
   ============================================================ */
function MissionCard({
    primaryAction, secondaryActions,
}: {
    primaryAction: { title: string; description: string; to: string; cta: string }
    secondaryActions: Array<{ label: string; to: string }>
}) {
    const { txt } = useLocaleText()
    const { activePlateId, setActivePlate, clearActivePlate } = useSpatialStore()
    const id = "mission-card"
    const isActive = activePlateId === id
    const isBackground = activePlateId !== null && activePlateId !== id

    return (
        <SpatialPlate
            isActive={isActive} isBackground={isBackground}
            onMouseEnter={() => setActivePlate(id)} onMouseLeave={clearActivePlate}
            intensity="high" className="p-5 md:p-6"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                        <Target size={12} />
                        {txt('Missão de Agora', 'Right-now mission')}
                    </p>
                    <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mt-1">{primaryAction.title}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-2xl">{primaryAction.description}</p>
                </div>
                <Magnetic strength={0.15}>
                    <NavLink to={primaryAction.to}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 hover:shadow-[0_0_20px_var(--accent)] transition-all w-fit group">
                        <Zap size={15} className="group-hover:scale-110 transition-transform" />
                        {primaryAction.cta}
                    </NavLink>
                </Magnetic>
            </div>
            {secondaryActions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {secondaryActions.map((action) => (
                        <NavLink key={`${action.to}-${action.label}`} to={action.to}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors">
                            {action.label} <ArrowRight size={11} />
                        </NavLink>
                    ))}
                </div>
            )}
        </SpatialPlate>
    )
}

/* ============================================================
   NUCLEAR LOOP CARD
   ============================================================ */
function NuclearLoopCard({ captureDone, understandDone, actDone }: {
    captureDone: boolean; understandDone: boolean; actDone: boolean
}) {
    const { txt } = useLocaleText()
    const steps = [
        { id: 'capture', title: txt('Capturar', 'Capture'), desc: txt('Regista um movimento ou digitaliza talao.', 'Log a transaction or scan a receipt.'), to: '/financeiro', done: captureDone },
        { id: 'understand', title: txt('Entender', 'Understand'), desc: txt('Confirma categoria, valor e contexto.', 'Confirm category, value, and context.'), to: '/financeiro', done: understandDone },
        { id: 'act', title: txt('Agir', 'Act'), desc: txt('Transforma sinal em tarefa executavel.', 'Turn a signal into an actionable task.'), to: '/todo', done: actDone },
    ]
    const doneCount = steps.filter((s) => s.done).length
    const progress = Math.round((doneCount / steps.length) * 100)
    const { activePlateId, setActivePlate, clearActivePlate } = useSpatialStore()
    const plateId = "nuclear-loop"
    const isActive = activePlateId === plateId
    const isBackground = activePlateId !== null && activePlateId !== plateId

    return (
        <SpatialPlate isActive={isActive} isBackground={isBackground}
            onMouseEnter={() => setActivePlate(plateId)} onMouseLeave={clearActivePlate}
            className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">{txt('Loop Nuclear em 10s', 'Nuclear Loop in 10s')}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{txt('O produto vale ouro quando este ciclo nao quebra.', 'The product becomes gold when this loop never breaks.')}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{doneCount}/3 • {progress}%</span>
            </div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                {steps.map((step) => (
                    <div key={step.id} className={`rounded-sm px-3.5 py-3 ${step.done ? 'text-[var(--success)] shadow-[0_0_15px_rgba(22,163,74,0.1)]' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">{step.desc}</p>
                            </div>
                            <div className={`w-5 h-5 flex items-center justify-center ${step.done ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}`}>
                                {step.done ? <CheckCircle2 size={12} /> : <Clock size={11} />}
                            </div>
                        </div>
                        <NavLink to={step.to} className="inline-flex items-center gap-1.5 text-xs mt-3 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
                            {step.done ? txt('Rever', 'Review') : txt('Executar', 'Run')} <ArrowRight size={11} />
                        </NavLink>
                    </div>
                ))}
            </div>
        </SpatialPlate>
    )
}

/* ============================================================
   KPI STAT CARD
   ============================================================ */
function KpiCard({ icon: Icon, label, value, color, to }: {
    icon: typeof DollarSign; label: string; value: string; color: string; to: string
}) {
    return (
        <NavLink to={to}>
            <motion.div variants={fadeUp}
                className="glass-card flex items-center gap-3 px-4 py-3.5 cursor-pointer group
                    hover:border-[var(--border-hover)] active:scale-[0.98] transition-all"
                style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-overline text-[10px]">{label}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums group-hover:text-[var(--accent)] transition-colors truncate">{value}</p>
                </div>
            </motion.div>
        </NavLink>
    )
}

/* ============================================================
   FINANCIAL HERO CARD
   ============================================================ */
function FinancialHero({ financialMood }: { financialMood: string }) {
    const { txt, isEnglish } = useLocaleText()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary, isLoading } = useMonthSummary(currentMonth)
    const { activePlateId, setActivePlate, clearActivePlate } = useSpatialStore()
    const id = "financial-hero"
    const isActive = activePlateId === id
    const isBackground = activePlateId !== null && activePlateId !== id

    if (isLoading) {
        return (
            <div className="rounded-3xl border border-white/5 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-8 h-72 flex items-center justify-center">
                <div className="skeleton h-10 w-48 rounded-xl" />
            </div>
        )
    }

    const { income = 0, expenses = 0, balance = 0 } = summary || {}
    const total = income + expenses || 1
    const incPct = Math.round((income / total) * 100)
    const expPct = 100 - incPct
    const sparkData = Array.from({ length: 14 }, (_, i) => ({ day: i, val: Math.round(balance * (0.6 + Math.sin(i * 0.45) * 0.4)) }))

    // Empathic border accent
    const borderAccent = financialMood === 'stressed'
        ? 'border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.08)]'
        : ''

    return (
        <SpatialPlate isActive={isActive} isBackground={isBackground}
            onMouseEnter={() => setActivePlate(id)} onMouseLeave={clearActivePlate}
            intensity="high" className={`relative overflow-hidden p-6 md:p-8 ${borderAccent}`}>
            <div className="relative z-20 flex flex-col items-center justify-center text-center mt-4">
                <p className="text-xs tracking-widest uppercase text-[var(--text-tertiary)] mb-2">{txt('Saude Financeira', 'Financial Health')}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mb-6">
                    {txt('Periodo: ', 'Period: ')} {new Date().toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] leading-none z-30 relative">
                    {formatCurrency(balance)}
                </p>
            </div>
            <div className="absolute inset-0 z-10 opacity-70 mt-32">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.6} />
                                <stop offset="60%" stopColor="var(--accent)" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                            <filter id="glow"><feGaussianBlur stdDeviation="6" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={4} fill="url(#heroGrad)" dot={false} style={{ filter: 'url(#glow)' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="relative z-20 mt-20 flex flex-col items-center">
                <div className="w-full max-w-sm flex h-1.5 rounded-full overflow-hidden bg-white/5 backdrop-blur-md">
                    <div className="h-full bg-[var(--success)] shadow-[0_0_10px_rgba(22,163,74,0.5)] transition-all duration-1000" style={{ width: `${incPct}%` }} />
                    <div className="h-full bg-[var(--danger)] shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all duration-1000" style={{ width: `${expPct}%` }} />
                </div>
                <div className="w-full max-w-sm flex justify-between mt-3 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)] drop-shadow-md">
                        <TrendingUp size={14} className="text-[var(--success)]" /> {txt('Receitas', 'Income')}: <span className="text-white">{formatCurrency(income)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)] drop-shadow-md">
                        <TrendingDown size={14} className="text-[var(--danger)]" /> {txt('Despesas', 'Expenses')}: <span className="text-white">{formatCurrency(expenses)}</span>
                    </span>
                </div>
            </div>
        </SpatialPlate>
    )
}

/* ============================================================
   MODULE CARDS
   ============================================================ */
function ModuleCard({ id, title, accent, icon: Icon, to, children }: {
    id: string; title: string; accent: string; icon: typeof DollarSign; to: string; children: React.ReactNode
}) {
    const { txt } = useLocaleText()
    const { activePlateId, setActivePlate, clearActivePlate } = useSpatialStore()
    const isActive = activePlateId === id
    const isBackground = activePlateId !== null && activePlateId !== id

    return (
        <SpatialPlate isActive={isActive} isBackground={isBackground}
            onMouseEnter={() => setActivePlate(id)} onMouseLeave={clearActivePlate}
            className="flex flex-col p-5 min-h-[220px]">
            <div className="flex items-center justify-between mb-6 relative z-20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center transition-colors" style={{ color: isActive ? accent : 'var(--text-secondary)' }}>
                        <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_currentColor]' : ''} />
                    </div>
                    <h3 className="text-base font-bold tracking-tight" style={{ color: isActive ? accent : 'var(--text-primary)' }}>{title}</h3>
                </div>
                <NavLink to={to} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                    {txt('Abrir', 'Open')} <ArrowRight size={12} />
                </NavLink>
            </div>
            <div className="flex-1 relative z-10 transition-opacity duration-300" style={{ opacity: isBackground ? 0.6 : 1 }}>
                {children}
            </div>
        </SpatialPlate>
    )
}

/* --- Todo Module Content --- */
function TodoContent() {
    const { txt } = useLocaleText()
    const { data: todos, isLoading, isError, refetch } = useTodos()
    if (isLoading) return <div className="skeleton h-20 rounded-xl" />
    if (isError) return <EmptyMomentum variant="error" icon={<AlertCircle size={18} />} title={txt('Nao foi possivel carregar tarefas', 'Could not load tasks')} message={txt('Verifica a ligacao e tenta novamente.', 'Check your connection and try again.')} action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void refetch() } }} compact />

    const pending = todos?.filter(t => t.status !== 'done') || []
    const high = pending.filter(t => t.priority === 'high')
    const total = todos?.length || 1
    const donePct = Math.round(((total - pending.length) / total) * 100)

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{pending.length}</span>
                {high.length > 0 && <span className="badge badge-warning">{high.length} {txt('alta', 'high')}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{ width: `${donePct}%` }} />
                </div>
                <span className="tabular-nums">{donePct}%</span>
            </div>
            <div className="flex-1 space-y-1">
                {pending.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-3 text-sm text-[var(--text-primary)] py-1.5 border-b border-white/5 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'high' ? 'bg-[var(--warning)] shadow-[0_0_8px_var(--warning)]' : t.priority === 'medium' ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`} />
                        <span className="truncate font-medium">{t.title}</span>
                    </div>
                ))}
                {pending.length === 0 && (
                    <div className="pt-2">
                        <NavLink to="/todo" className="inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                            <Plus size={12} /> {txt('Criar primeira tarefa', 'Create first task')}
                        </NavLink>
                    </div>
                )}
            </div>
        </div>
    )
}

/* --- Links Module Content --- */
function LinksContent() {
    const { txt } = useLocaleText()
    const { data: links, isLoading, isError, refetch } = useLinks()
    if (isLoading) return <div className="skeleton h-20 rounded-xl" />
    if (isError) return <EmptyMomentum variant="error" icon={<Link2 size={18} />} title={txt('Erro ao carregar links', 'Error loading links')} message={txt('Nao conseguimos ler os teus links agora.', 'We could not read your links right now.')} action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void refetch() } }} compact />

    const recent = links?.slice(0, 3) || []
    return (
        <div className="flex flex-col gap-3 h-full">
            <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                {links?.length || 0} <span className="text-sm font-normal text-[var(--text-secondary)]">{txt('artigos', 'articles')}</span>
            </p>
            <div className="flex-1 space-y-1">
                {recent.map(l => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-[var(--text-primary)] hover:text-white transition-colors py-1.5 border-b border-white/5 last:border-0 truncate group/link">
                        <ExternalLink size={14} className="shrink-0 text-[var(--text-tertiary)] group-hover/link:text-white transition-colors" />
                        <span className="truncate font-medium">{l.title || l.url}</span>
                    </a>
                ))}
                {recent.length === 0 && (
                    <div className="pt-2">
                        <NavLink to="/links" className="inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                            <Plus size={12} /> {txt('Guardar primeiro link', 'Save first link')}
                        </NavLink>
                    </div>
                )}
            </div>
        </div>
    )
}

/* --- Crypto Module Content --- */
function CryptoContent() {
    const { txt } = useLocaleText()
    const { portfolio, isLoadingPortfolio, transactions } = useWeb3()
    if (isLoadingPortfolio) return <div className="skeleton h-20 rounded-xl" />
    if (transactions.isError) return <EmptyMomentum variant="error" icon={<Bitcoin size={18} />} title={txt('Erro ao carregar portfolio', 'Error loading portfolio')} message={txt('Os dados cripto estao temporariamente indisponiveis.', 'Crypto data is temporarily unavailable.')} action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void transactions.refetch() } }} compact />

    const totalValue = portfolio.reduce((acc, a) => acc + (a.value || 0), 0)
    const change = totalValue > 0 ? portfolio.reduce((acc, a) => acc + (a.price_change_24h ?? 0) * (a.value / totalValue), 0) : 0
    const topAssets = [...portfolio].sort((a, b) => b.value - a.value).slice(0, 4)
    const COLORS = ['var(--accent)', 'var(--warning)', 'var(--info)', 'var(--success)']

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(totalValue)}</span>
                <span className={`badge ${change >= 0 ? 'badge-success' : 'badge-danger'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
            </div>
            {topAssets.length > 0 && (
                <div className="flex-1 space-y-2 mt-2">
                    {topAssets.map((a, i) => (
                        <div key={a.symbol} className="flex items-center justify-between text-sm border-b border-white/5 last:border-0 pb-2">
                            <span className="flex items-center gap-3 text-[var(--text-primary)] font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}80` }} />
                                {a.symbol}
                            </span>
                            <span className="text-white font-bold tabular-nums">{formatCurrency(a.value)}</span>
                        </div>
                    ))}
                </div>
            )}
            {portfolio.length === 0 && (
                <div className="pt-2">
                    <NavLink to="/crypto" className="inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                        <Plus size={12} /> {txt('Adicionar primeira wallet', 'Add first wallet')}
                    </NavLink>
                </div>
            )}
        </div>
    )
}

/* ============================================================
   NEWS SECTION
   ============================================================ */
function NewsSection() {
    const { txt } = useLocaleText()
    const { data: items = [], isLoading, isError, refetch } = useTopStories(5)
    const TOPIC_COLORS: Record<string, string> = { AI: 'var(--accent)', Crypto: 'var(--warning)', Geopolitics: 'var(--danger)', Macro: 'var(--info)', Regulation: '#06b6d4', Tech: 'var(--success)' }
    const { activePlateId, setActivePlate, clearActivePlate } = useSpatialStore()
    const id = "news-section"
    const isActive = activePlateId === id
    const isBackground = activePlateId !== null && activePlateId !== id

    if (isLoading) return <SpatialPlate className="p-6 h-48 flex items-center justify-center"><div className="skeleton h-10 w-48 rounded-xl" /></SpatialPlate>
    if (isError) return <SpatialPlate><EmptyMomentum variant="error" icon={<Newspaper size={18} />} title={txt('Erro no feed de noticias', 'News feed error')} message={txt('Nao foi possivel atualizar as noticias agora.', 'Could not refresh news right now.')} action={{ label: txt('Recarregar feed', 'Reload feed'), onClick: () => { void refetch() } }} compact /></SpatialPlate>
    if (items.length === 0) return <SpatialPlate><EmptyMomentum icon={<Newspaper size={18} />} title={txt('Nenhuma noticia por agora', 'No news for now')} message={txt('As tuas noticias curadas aparecerao aqui.', 'Your curated news will appear here.')} compact /></SpatialPlate>

    return (
        <SpatialPlate isActive={isActive} isBackground={isBackground}
            onMouseEnter={() => setActivePlate(id)} onMouseLeave={clearActivePlate}
            className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-h3 text-sm">{txt('Noticias', 'News')}</h3>
                <NavLink to="/news" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                    {txt('Ver todas', 'View all')} <ArrowRight size={12} />
                </NavLink>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
                {items.map(item => {
                    const color = TOPIC_COLORS[item.topic_primary] || 'var(--text-tertiary)'
                    return (
                        <a key={item.id} href={item.source_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                            <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>{item.topic_primary}</span>
                                    <span className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(item.published_at)}</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] line-clamp-1 group-hover:text-[var(--text-primary)] transition-colors">{item.title}</p>
                            </div>
                        </a>
                    )
                })}
            </div>
        </SpatialPlate>
    )
}

/* ============================================================
   MODULES SECTION (grouped)
   ============================================================ */
function ModulesSection() {
    const { txt } = useLocaleText()
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModuleCard id="mod-todo" title="To-Do" accent="var(--warning)" icon={CheckSquare} to="/todo">
                <TodoContent />
            </ModuleCard>
            <ModuleCard id="mod-links" title={txt('Gestor de Links', 'Link Manager')} accent="var(--accent)" icon={Link2} to="/links">
                <LinksContent />
            </ModuleCard>
            <ModuleCard id="mod-crypto" title={txt('Ledger Cripto', 'Crypto Ledger')} accent="var(--purple)" icon={Bitcoin} to="/crypto">
                <CryptoContent />
            </ModuleCard>
        </div>
    )
}

/* ============================================================
   MAIN DASHBOARD PAGE
   ============================================================ */
export function DashboardPage() {
    const { user } = useAuth()
    const { txt, isEnglish } = useLocaleText()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const summaryQuery = useMonthSummary(currentMonth)
    const todosQuery = useTodos()
    const entriesQuery = useEntries(currentMonth)
    const { portfolio } = useWeb3()
    const linksQuery = useLinks()

    const summary = summaryQuery.data
    const todos = todosQuery.data
    const links = linksQuery.data

    const pending = todos?.filter(t => t.status !== 'done')?.length ?? 0
    const highPriority = todos?.filter(t => t.status !== 'done' && t.priority === 'high')?.length ?? 0
    const totalPortfolio = portfolio.reduce((acc: number, a: any) => acc + (a.value || 0), 0)

    const hasFinancialEntries = (entriesQuery.data?.length ?? 0) > 0
    const hasLinks = (links?.length ?? 0) > 0
    const userName = user?.email?.split('@')[0] || txt('Operador', 'Operator')
    const todayIso = new Date().toISOString().slice(0, 10)
    const todayEntries = (entriesQuery.data ?? []).filter((entry) => entry.date === todayIso)
    const moneyInToday = todayEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount), 0)
    const moneyOutToday = todayEntries.filter((entry) => entry.type === 'expense' || entry.type === 'bill').reduce((sum, entry) => sum + Number(entry.amount), 0)
    const needsActionNow = highPriority

    // ── Empathy Engine ──
    const computeEmpathy = useEmpathyStore((s) => s.compute)
    const empathy = useEmpathyState()

    const budgetPct = useMemo(() => {
        if (!summary || !summary.income) return 0
        return Math.round((summary.expenses / summary.income) * 100)
    }, [summary])

    useEffect(() => {
        computeEmpathy({
            pendingTasks: pending,
            highPriorityTasks: highPriority,
            unreadAlerts: 0, // alerts are consumed separately
            budgetUsagePct: budgetPct,
            consecutiveDaysWithEntry: hasFinancialEntries ? 1 : 0, // simplified streak
        })
    }, [pending, highPriority, budgetPct, hasFinancialEntries, computeEmpathy])

    // Apply ambient CSS whenever empathy changes
    useEffect(() => {
        applyAmbientCSS(empathy)
    }, [empathy])

    // ── Widget Order (empathy-driven + user override) ──
    const defaultOrder = useMemo(() => empathyOrder(empathy), [empathy])

    const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
        return getStoredOrder() ?? defaultOrder
    })

    const [isCustomOrder, setIsCustomOrder] = useState(() => getStoredOrder() !== null)

    const handleResetOrder = useCallback(() => {
        clearStoredOrder()
        setWidgetOrder(defaultOrder)
        setIsCustomOrder(false)
    }, [defaultOrder])

    // ── dnd-kit ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        setWidgetOrder((prev) => {
            const oldIndex = prev.indexOf(active.id as WidgetId)
            const newIndex = prev.indexOf(over.id as WidgetId)
            const next = arrayMove(prev, oldIndex, newIndex)
            persistOrder(next)
            setIsCustomOrder(true)
            return next
        })
    }, [])

    // ── Mission logic ──
    const missionPrimary = needsActionNow > 0
        ? { title: txt('Fecha as tarefas críticas primeiro', 'Close critical tasks first'), description: txt('Tens tarefas de alta prioridade em aberto. Resolver isto primeiro reduz ruído no resto do dia.', 'You have high-priority tasks open. Clearing them first removes noise from the rest of the day.'), to: '/todo', cta: txt('Ir para tarefas críticas', 'Go to critical tasks') }
        : !hasFinancialEntries
            ? { title: txt('Regista o teu primeiro movimento financeiro', 'Log your first financial transaction'), description: txt('Sem base financeira não há clareza de caixa. Faz 1 registo agora para ativar os insights.', 'Without financial baseline there is no cash clarity. Add one transaction now to unlock insights.'), to: '/financeiro', cta: txt('Registar movimento', 'Log transaction') }
            : !hasLinks
                ? { title: txt('Centraliza 3 links-chave', 'Centralize 3 key links'), description: txt('Guardar referências críticas em contexto reduz dispersão e acelera execução.', 'Saving critical references in context reduces scatter and speeds execution.'), to: '/links', cta: txt('Organizar links', 'Organize links') }
                : { title: txt('Mantém o ciclo diário ativo', 'Keep the daily loop active'), description: txt('Atualiza caixa, prioridades e decisões para manter o sistema a trabalhar por ti.', 'Update cash, priorities, and decisions to keep the system working for you.'), to: '/financeiro', cta: txt('Abrir centro financeiro', 'Open financial center') }

    // ── Widget renderer ──
    const renderWidget = useCallback((id: WidgetId) => {
        switch (id) {
            case 'mission':
                return (
                    <MissionCard
                        primaryAction={missionPrimary}
                        secondaryActions={[
                            { label: txt('Rever despesas', 'Review expenses'), to: '/financeiro' },
                            { label: txt('Atualizar prioridades', 'Update priorities'), to: '/todo' },
                            { label: txt('Ver links críticos', 'See critical links'), to: '/links' },
                        ]}
                    />
                )
            case 'financial':
                return <FinancialHero financialMood={empathy.financialMood} />
            case 'nuclear':
                return (
                    <NuclearLoopCard
                        captureDone={hasFinancialEntries}
                        understandDone={(summary?.expenses ?? 0) > 0 || (summary?.income ?? 0) > 0}
                        actDone={needsActionNow === 0}
                    />
                )
            case 'modules':
                return <ModulesSection />
            case 'news':
                return <NewsSection />
        }
    }, [missionPrimary, empathy.financialMood, hasFinancialEntries, summary, needsActionNow, txt])

    return (
        <motion.div variants={stagger} initial="hidden" animate="show"
            className="group/dashboard w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-16 pb-[var(--dock-clearance)] flex flex-col items-center">

            {/* Ambient tint overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 transition-colors duration-[2000ms]"
                style={{ background: `radial-gradient(ellipse at 50% 0%, var(--ambient-tint, transparent), transparent 70%)` }} />

            {/* Header */}
            <motion.div variants={fadeUp} className="w-full mb-8 relative z-10 text-center md:text-left flex flex-col items-center md:items-start max-w-5xl">
                <h1 className="text-h1 text-3xl md:text-4xl tracking-tight mb-2">
                    {getGreeting(isEnglish)}, <span className="text-[var(--accent)]">{userName}</span>
                </h1>
                <p className="text-base text-[var(--text-secondary)]">
                    {txt('Base central de comando. Foca-te na proxima margem de vitoria.', 'Central command base. Focus on the next winning margin.')}
                </p>
            </motion.div>

            {/* Proactive Alerts */}
            <ProactiveAlertStrip />

            {/* Today Pulse */}
            <motion.div variants={fadeUp} className="w-full max-w-5xl mb-4">
                <TodayPulseCard moneyIn={moneyInToday} moneyOut={moneyOutToday} actionNow={needsActionNow} />
            </motion.div>

            {/* KPI Strip */}
            <motion.div variants={stagger} className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <KpiCard icon={DollarSign} label={txt('Saldo', 'Balance')} value={summary ? formatCurrency(summary.balance) : '--'} color="var(--success)" to="/financeiro" />
                <KpiCard icon={CheckSquare} label={txt('Tarefas', 'Tasks')} value={`${pending}`} color="var(--warning)" to="/todo" />
                <KpiCard icon={Bitcoin} label="Crypto" value={formatCurrency(totalPortfolio)} color="var(--purple)" to="/crypto" />
            </motion.div>

            {/* Reset order button */}
            {isCustomOrder && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl flex justify-end mb-3">
                    <button onClick={handleResetOrder}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors cursor-pointer">
                        <RotateCcw size={12} /> {txt('Restaurar layout inteligente', 'Restore smart layout')}
                    </button>
                </motion.div>
            )}

            {/* Adaptive Widget Stack (dnd-kit sortable) */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
                    <div className="w-full max-w-5xl flex flex-col gap-6">
                        {widgetOrder.map((id) => (
                            <SortableWidget key={id} id={id}>
                                {renderWidget(id)}
                            </SortableWidget>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Next Action Strip */}
            <motion.div variants={fadeUp} className="w-full max-w-[600px] mt-16 z-50 relative">
                <NextActionsStrip
                    title={txt('Proxima melhoria recomendada', 'Next recommended improvement')}
                    actions={[
                        { label: txt('Priorizar tarefas', 'Prioritize tasks'), to: '/todo' },
                        { label: txt('Rever despesas', 'Review expenses'), to: '/financeiro' },
                    ]}
                />
            </motion.div>
        </motion.div>
    )
}
