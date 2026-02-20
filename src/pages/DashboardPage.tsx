import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { NavLink } from 'react-router'
import {
    DollarSign, CheckSquare, Link2, Bitcoin, ArrowRight,
    Newspaper, Activity, TrendingUp, TrendingDown, AlertCircle,
    Clock, ExternalLink, BookOpen, CheckCircle2,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { useMonthSummary } from '@/hooks/useFinancial'
import { useTodos } from '@/hooks/useTodos'
import { useWeb3 } from '@/hooks/useWeb3'
import { useLinks } from '@/hooks/useLinks'
import { useTopStories } from '@/hooks/useNews'
import { timeAgo } from '@/services/newsService'
import { formatCurrency } from '@/utils/format'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
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
                style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-overline text-[10px]">{label}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums group-hover:text-[var(--accent)] transition-colors truncate">
                        {value}
                    </p>
                </div>
            </motion.div>
        </NavLink>
    )
}

/* ============================================================
   FINANCIAL HERO CARD
   ============================================================ */
function FinancialHero() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary, isLoading } = useMonthSummary(currentMonth)

    if (isLoading) {
        return <div className="glass-card-static p-8 h-72 flex items-center justify-center">
            <div className="skeleton h-10 w-48 rounded-xl" />
        </div>
    }

    const { income = 0, expenses = 0, balance = 0 } = summary || {}
    const total = income + expenses || 1
    const incPct = Math.round((income / total) * 100)
    const expPct = 100 - incPct

    const sparkData = Array.from({ length: 14 }, (_, i) => ({
        day: i,
        val: Math.round(balance * (0.6 + Math.sin(i * 0.45) * 0.4)),
    }))

    return (
        <motion.div variants={fadeUp} className="glass-card-static relative overflow-hidden p-6 md:p-8">
            {/* Subtle dot grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, var(--text-primary) 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px',
                }} />

            <div className="relative z-10">
                <p className="text-overline mb-2">
                    Saldo de {new Date().toLocaleDateString('pt-PT', { month: 'long' }).toUpperCase()}
                </p>
                <p className="text-4xl md:text-[3.5rem] font-bold tabular-nums text-[var(--text-primary)] tracking-tight leading-none"
                    style={{ textShadow: '0 0 40px var(--accent-glow)' }}>
                    {formatCurrency(balance)}
                </p>
            </div>

            {/* Chart */}
            <div className="relative z-10 h-28 mt-4 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="var(--accent)" strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Income vs Expense bar */}
            <div className="relative z-10 mt-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-surface)]">
                    <div className="rounded-l-full bg-[var(--success)] transition-all duration-500" style={{ width: `${incPct}%` }} />
                    <div className="rounded-r-full bg-[var(--danger)] transition-all duration-500" style={{ width: `${expPct}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                    <span className="flex items-center gap-1 text-[var(--success)]">
                        <TrendingUp size={12} /> Receitas: {formatCurrency(income)}
                    </span>
                    <span className="flex items-center gap-1 text-[var(--danger)]">
                        <TrendingDown size={12} /> Despesas: {formatCurrency(expenses)}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}

/* ============================================================
   MODULE CARDS
   ============================================================ */
function ModuleCard({ title, accent, icon: Icon, to, children }: {
    title: string; accent: string; icon: typeof DollarSign; to: string; children: React.ReactNode
}) {
    return (
        <motion.div variants={fadeUp} className="glass-card-static flex flex-col p-5 min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                        <Icon size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                </div>
                <NavLink to={to} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                    Ver tudo <ArrowRight size={12} />
                </NavLink>
            </div>
            <div className="flex-1">{children}</div>
        </motion.div>
    )
}

/* --- Todo Module Content --- */
function TodoContent() {
    const { data: todos, isLoading } = useTodos()
    if (isLoading) return <div className="skeleton h-20 rounded-xl" />

    const pending = todos?.filter(t => t.status !== 'done') || []
    const high = pending.filter(t => t.priority === 'high')
    const total = todos?.length || 1
    const donePct = Math.round(((total - pending.length) / total) * 100)

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{pending.length}</span>
                {high.length > 0 && <span className="badge badge-warning">{high.length} alta</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{ width: `${donePct}%` }} />
                </div>
                <span className="tabular-nums">{donePct}%</span>
            </div>
            <div className="flex-1 space-y-1">
                {pending.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-1">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            t.priority === 'high' ? 'bg-[var(--warning)]' : t.priority === 'medium' ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'
                        }`} />
                        <span className="truncate">{t.title}</span>
                    </div>
                ))}
                {pending.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <CheckCircle2 size={18} className="text-[var(--success)] opacity-50" />
                    </div>
                )}
            </div>
        </div>
    )
}

/* --- Links Module Content --- */
function LinksContent() {
    const { data: links, isLoading } = useLinks()
    if (isLoading) return <div className="skeleton h-20 rounded-xl" />

    const recent = links?.slice(0, 3) || []
    return (
        <div className="flex flex-col gap-3 h-full">
            <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                {links?.length || 0} <span className="text-sm font-normal text-[var(--text-secondary)]">artigos</span>
            </p>
            <div className="flex-1 space-y-1">
                {recent.map(l => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors py-1 truncate">
                        <ExternalLink size={11} className="shrink-0 opacity-40" />
                        <span className="truncate">{l.title || l.url}</span>
                    </a>
                ))}
                {recent.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                        <BookOpen size={18} className="opacity-30 mb-1" /> <span className="text-xs">Sem links</span>
                    </div>
                )}
            </div>
        </div>
    )
}

/* --- Crypto Module Content --- */
function CryptoContent() {
    const { portfolio, isLoadingPortfolio } = useWeb3()
    if (isLoadingPortfolio) return <div className="skeleton h-20 rounded-xl" />

    const totalValue = portfolio.reduce((acc, a) => acc + (a.value || 0), 0)
    const change = totalValue > 0 ? portfolio.reduce((acc, a) => acc + (a.price_change_24h ?? 0) * (a.value / totalValue), 0) : 0
    const topAssets = [...portfolio].sort((a, b) => b.value - a.value).slice(0, 4)
    const COLORS = ['var(--accent)', 'var(--warning)', 'var(--info)', 'var(--success)']

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(totalValue)}</span>
                <span className={`badge ${change >= 0 ? 'badge-success' : 'badge-danger'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
            </div>
            {topAssets.length > 0 && (
                <div className="flex-1 space-y-1.5">
                    {topAssets.map((a, i) => (
                        <div key={a.symbol} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <span className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                                {a.symbol}
                            </span>
                            <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatCurrency(a.value)}</span>
                        </div>
                    ))}
                </div>
            )}
            {portfolio.length === 0 && (
                <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-xs">Sem wallets</div>
            )}
        </div>
    )
}

/* --- Activity Module Content --- */
function ActivityContent() {
    return (
        <div className="empty-state py-6">
            <Activity className="empty-state-icon" />
            <p className="empty-state-title">Sem atividade</p>
            <p className="empty-state-desc">As tuas acoes aparecerão aqui</p>
        </div>
    )
}

/* ============================================================
   NEWS SECTION
   ============================================================ */
function NewsSection() {
    const { data: items = [], isLoading } = useTopStories(5)

    const TOPIC_COLORS: Record<string, string> = {
        AI: 'var(--accent)', Crypto: 'var(--warning)', Geopolitics: 'var(--danger)',
        Macro: 'var(--info)', Regulation: '#06b6d4', Tech: 'var(--success)',
    }

    if (isLoading) return (
        <motion.div variants={fadeUp} className="glass-card-static p-6 h-48 flex items-center justify-center">
            <div className="skeleton h-10 w-48 rounded-xl" />
        </motion.div>
    )

    if (items.length === 0) return (
        <motion.div variants={fadeUp} className="glass-card-static">
            <div className="empty-state py-12">
                <Newspaper className="empty-state-icon" size={48} />
                <p className="empty-state-title">Nenhuma noticia por agora</p>
                <p className="empty-state-desc">As tuas noticias curadas aparecerao aqui</p>
            </div>
        </motion.div>
    )

    return (
        <motion.div variants={fadeUp} className="glass-card-static overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-h3 text-sm">Noticias</h3>
                <NavLink to="/news" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                    Ver todas <ArrowRight size={12} />
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
                                    <span className="text-[9px] font-semibold uppercase tracking-wider"
                                        style={{ color }}>{item.topic_primary}</span>
                                    <span className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(item.published_at)}</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] line-clamp-1 group-hover:text-[var(--text-primary)] transition-colors">
                                    {item.title}
                                </p>
                            </div>
                        </a>
                    )
                })}
            </div>
        </motion.div>
    )
}

/* ============================================================
   MAIN DASHBOARD PAGE
   ============================================================ */
export function DashboardPage() {
    const { user } = useAuth()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary } = useMonthSummary(currentMonth)
    const { data: todos } = useTodos()
    const { portfolio } = useWeb3()
    const { data: links } = useLinks()

    const pending = todos?.filter(t => t.status !== 'done')?.length ?? 0
    const totalPortfolio = portfolio.reduce((acc: number, a: any) => acc + (a.value || 0), 0)

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 pb-12">
            {/* Header */}
            <motion.div variants={fadeUp}>
                <h1 className="text-h1 text-2xl md:text-3xl mb-1">
                    {getGreeting()}, <span className="text-[var(--accent)]">{user?.email?.split('@')[0]}</span>
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">Aqui esta o resumo do teu dia.</p>
            </motion.div>

            {/* KPI Row */}
            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <KpiCard icon={DollarSign} label="Saldo" value={summary ? formatCurrency(summary.balance) : '--'}
                    color="var(--success)" to="/financeiro" />
                <KpiCard icon={CheckSquare} label="Tarefas" value={`${pending}`}
                    color="var(--warning)" to="/todo" />
                <KpiCard icon={Link2} label="Links" value={`${links?.length ?? 0}`}
                    color="var(--accent)" to="/links" />
                <KpiCard icon={Bitcoin} label="Crypto" value={formatCurrency(totalPortfolio)}
                    color="var(--purple)" to="/crypto" />
                <KpiCard icon={Newspaper} label="Noticias" value="Feed"
                    color="var(--info)" to="/news" />
            </motion.div>

            {/* Financial Hero */}
            <FinancialHero />

            {/* Module Cards — 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModuleCard title="To-Do" accent="var(--warning)" icon={CheckSquare} to="/todo">
                    <TodoContent />
                </ModuleCard>
                <ModuleCard title="Gestor de Links" accent="var(--accent)" icon={Link2} to="/links">
                    <LinksContent />
                </ModuleCard>
                <ModuleCard title="Ledger Cripto" accent="var(--purple)" icon={Bitcoin} to="/crypto">
                    <CryptoContent />
                </ModuleCard>
                <ModuleCard title="Atividade Recente" accent="var(--success)" icon={Activity} to="/">
                    <ActivityContent />
                </ModuleCard>
            </div>

            {/* News */}
            <NewsSection />
        </motion.div>
    )
}
