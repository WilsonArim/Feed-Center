import { useState, useCallback } from 'react'
import { NavLink } from 'react-router'
import { motion } from 'framer-motion'
import {
    BookOpen,
    Wallet,
    CheckSquare,
    Link2,
    Newspaper,
    Bitcoin,
    Settings2,
    Sparkles,
    ArrowRight,
    Target,
    CircleDollarSign,
    Rocket,
    CheckCircle2,
    Circle,
    type LucideIcon,
} from 'lucide-react'
import { NextActionsStrip, PageHeader, PageSectionHeader } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'

/* ── Completion tracking ── */
const STORAGE_KEY = 'fc-guide-completed'

function getCompleted(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
        return new Set()
    }
}

function persistCompleted(ids: Set<string>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
    } catch { /* noop */ }
}

/* ── Data ── */
type Phase = 'day1' | 'week1' | 'power'

interface GuideItem {
    id: string
    icon: LucideIcon
    phase: Phase
    titlePt: string
    titleEn: string
    descPt: string
    descEn: string
    ctaPt: string
    ctaEn: string
    to: string
}

const PHASE_META: Record<Phase, { labelPt: string; labelEn: string }> = {
    day1: { labelPt: 'Primeiro dia', labelEn: 'First day' },
    week1: { labelPt: 'Primeira semana', labelEn: 'First week' },
    power: { labelPt: 'Poder total', labelEn: 'Full power' },
}

const GUIDE_ITEMS: GuideItem[] = [
    // Day 1
    {
        id: 'explore-dashboard',
        icon: Target,
        phase: 'day1',
        titlePt: 'Explorar o Dashboard',
        titleEn: 'Explore the Dashboard',
        descPt: 'Abre o dashboard e descobre o teu resumo diário em 30 segundos.',
        descEn: 'Open the dashboard and discover your daily summary in 30 seconds.',
        ctaPt: 'Abrir dashboard',
        ctaEn: 'Open dashboard',
        to: '/dashboard',
    },
    {
        id: 'first-expense',
        icon: Wallet,
        phase: 'day1',
        titlePt: 'Registar primeira despesa',
        titleEn: 'Log your first expense',
        descPt: 'Usa o registo rápido ou digitaliza um talão para começar.',
        descEn: 'Use quick entry or scan a receipt to get started.',
        ctaPt: 'Abrir financeiro',
        ctaEn: 'Open finance',
        to: '/financeiro',
    },
    {
        id: 'create-task',
        icon: CheckSquare,
        phase: 'day1',
        titlePt: 'Criar 3 tarefas prioritárias',
        titleEn: 'Create 3 priority tasks',
        descPt: 'Define as prioridades do dia no kanban.',
        descEn: 'Set your priorities for today on the kanban board.',
        ctaPt: 'Abrir tarefas',
        ctaEn: 'Open tasks',
        to: '/todo',
    },
    // Week 1
    {
        id: 'save-links',
        icon: Link2,
        phase: 'week1',
        titlePt: 'Guardar fontes úteis',
        titleEn: 'Save useful sources',
        descPt: 'Guarda artigos e links com tags para recuperar contexto.',
        descEn: 'Save articles and links with tags to recover context fast.',
        ctaPt: 'Abrir links',
        ctaEn: 'Open links',
        to: '/links',
    },
    {
        id: 'setup-news',
        icon: Newspaper,
        phase: 'week1',
        titlePt: 'Configurar feed de notícias',
        titleEn: 'Set up news feed',
        descPt: 'Filtra tópicos e transforma sinais importantes em tarefas.',
        descEn: 'Filter topics and convert relevant signals into tasks.',
        ctaPt: 'Abrir notícias',
        ctaEn: 'Open news',
        to: '/news',
    },
    {
        id: 'track-crypto',
        icon: Bitcoin,
        phase: 'week1',
        titlePt: 'Registar portfolio crypto',
        titleEn: 'Track crypto portfolio',
        descPt: 'Adiciona wallets e acompanha exposição entre spot e DeFi.',
        descEn: 'Add wallets and track exposure across spot and DeFi.',
        ctaPt: 'Abrir crypto',
        ctaEn: 'Open crypto',
        to: '/crypto',
    },
    // Power
    {
        id: 'master-cashflow',
        icon: CircleDollarSign,
        phase: 'power',
        titlePt: 'Dominar cash flow mensal',
        titleEn: 'Master monthly cash flow',
        descPt: 'Analisa tendências, inflação por item e padrões recorrentes.',
        descEn: 'Analyze trends, item-level inflation, and recurring patterns.',
        ctaPt: 'Abrir financeiro',
        ctaEn: 'Open finance',
        to: '/financeiro',
    },
    {
        id: 'aggressive-execution',
        icon: Rocket,
        phase: 'power',
        titlePt: 'Execução agressiva',
        titleEn: 'Aggressive execution',
        descPt: 'Transforma insights de news e links em tarefas com prioridade.',
        descEn: 'Turn news and link insights into prioritized tasks.',
        ctaPt: 'Abrir tarefas',
        ctaEn: 'Open tasks',
        to: '/todo',
    },
    {
        id: 'personalize-settings',
        icon: Settings2,
        phase: 'power',
        titlePt: 'Personalizar experiência',
        titleEn: 'Personalize experience',
        descPt: 'Define idioma, tema, página inicial e nome do copiloto.',
        descEn: 'Set language, theme, start page, and copilot name.',
        ctaPt: 'Abrir definições',
        ctaEn: 'Open settings',
        to: '/settings',
    },
]

/* ── Stagger animation variants ── */
const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 200 } },
}

/* ── Page ── */
export function StartGuidePage() {
    const { txt } = useLocaleText()
    const [completed, setCompleted] = useState<Set<string>>(() => getCompleted())

    const toggleCompleted = useCallback((id: string) => {
        setCompleted((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            persistCompleted(next)
            return next
        })
    }, [])

    const totalDone = completed.size
    const totalItems = GUIDE_ITEMS.length
    const progressPct = Math.round((totalDone / totalItems) * 100)

    const phases: Phase[] = ['day1', 'week1', 'power']

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-[var(--dock-clearance)]">
            <div className="w-full flex flex-col gap-8">
                <PageHeader
                    icon={<BookOpen size={18} />}
                    title={txt('Guia Interativo', 'Interactive Guide')}
                    subtitle={txt(
                        'Descobre o Feed Center ao teu ritmo. Marca cada passo quando completares.',
                        'Discover Feed Center at your own pace. Check off each step when done.'
                    )}
                    actions={(
                        <NavLink
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
                        >
                            <Sparkles size={16} />
                            {txt('Ir para dashboard', 'Go to dashboard')}
                        </NavLink>
                    )}
                />

                {/* Progress overview */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 flex items-center gap-5">
                    <div className="relative w-14 h-14 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-inset)" strokeWidth="3" />
                            <motion.circle
                                cx="18" cy="18" r="16" fill="none"
                                stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={100.5}
                                initial={{ strokeDashoffset: 100.5 }}
                                animate={{ strokeDashoffset: 100.5 - (progressPct / 100) * 100.5 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white tabular-nums">
                            {progressPct}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                            {totalDone} / {totalItems} {txt('passos completos', 'steps completed')}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {progressPct === 100
                                ? txt('Parabéns! Dominaste o Feed Center.', 'Congrats! You\'ve mastered Feed Center.')
                                : txt('Continua a explorar ao teu ritmo.', 'Keep exploring at your own pace.')}
                        </p>
                    </div>
                </div>

                {/* Phase sections */}
                {phases.map((phase) => {
                    const items = GUIDE_ITEMS.filter((g) => g.phase === phase)
                    const phaseDone = items.filter((g) => completed.has(g.id)).length
                    const meta = PHASE_META[phase]
                    return (
                        <div key={phase} className="space-y-4">
                            <PageSectionHeader
                                title={txt(meta.labelPt, meta.labelEn)}
                                subtitle={`${phaseDone}/${items.length} ${txt('completos', 'completed')}`}
                            />

                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, margin: '-40px' }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {items.map((item) => (
                                    <DiscoveryCard
                                        key={item.id}
                                        item={item}
                                        isDone={completed.has(item.id)}
                                        onToggle={toggleCompleted}
                                    />
                                ))}
                            </motion.div>
                        </div>
                    )
                })}

                {/* Shortcuts */}
                <div className="py-4 border-t border-white/5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {txt('Atalhos úteis', 'Useful shortcuts')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            {txt('Abrir input rápido', 'Open quick input')}: <kbd className="text-[var(--text-primary)]">Cmd/Ctrl + K</kbd>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            {txt('Fechar modal', 'Close modal')}: <kbd className="text-[var(--text-primary)]">Esc</kbd>
                        </span>
                    </div>
                </div>

                <NextActionsStrip
                    title={txt('Quando quiseres, define a tua página inicial em Definições > Página Inicial.', 'Whenever you want, set your start page in Settings > Home Page.')}
                    actions={[
                        { label: txt('Abrir página Hoje', 'Open Today page'), to: '/today' },
                        { label: txt('Configurar página inicial', 'Configure start page'), to: '/settings' },
                        { label: txt('Ir para tarefas', 'Go to tasks'), to: '/todo' },
                    ]}
                />
            </div>
        </div>
    )
}

/* ── Discovery Card ── */
function DiscoveryCard({ item, isDone, onToggle }: {
    item: GuideItem
    isDone: boolean
    onToggle: (id: string) => void
}) {
    const { txt } = useLocaleText()
    const Icon = item.icon

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
            className={`group relative flex flex-col gap-4 p-5 rounded-2xl border transition-all cursor-default
                ${isDone
                    ? 'border-[var(--success)]/25 bg-[var(--success)]/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-[var(--accent)]/25'
                }`}
        >
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${isDone
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : 'bg-[var(--accent)]/12 text-[var(--accent)]'
                    }`}>
                    <Icon size={18} />
                </div>
                <button
                    onClick={() => onToggle(item.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label={isDone ? txt('Desmarcar', 'Unmark') : txt('Marcar como feito', 'Mark as done')}
                >
                    {isDone
                        ? <CheckCircle2 size={20} className="text-[var(--success)]" />
                        : <Circle size={20} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)]" />
                    }
                </button>
            </div>

            <div>
                <h3 className={`text-sm font-bold ${isDone ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {txt(item.titlePt, item.titleEn)}
                </h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">
                    {txt(item.descPt, item.descEn)}
                </p>
            </div>

            <NavLink
                to={item.to}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg
                    border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)]
                    transition-colors w-fit mt-auto"
            >
                {txt(item.ctaPt, item.ctaEn)}
                <ArrowRight size={12} />
            </NavLink>
        </motion.div>
    )
}
