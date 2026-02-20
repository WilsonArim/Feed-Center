import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { BentoGrid, type BentoItem } from '@/components/ui/BentoGrid'
import {
    DollarSign,
    CheckSquare,
    Link2,
    Bitcoin,
    Activity,
    Newspaper,
    Sparkles,
    Bell,
} from 'lucide-react'
import { InfiniteMarquee } from '@/components/ui/InfiniteMarquee'
import { FinancialWidget } from '@/components/modules/dashboard/FinancialWidget'
import { TodoWidget } from '@/components/modules/dashboard/TodoWidget'
import { CryptoWidget } from '@/components/modules/dashboard/CryptoWidget'
import { LinksWidget } from '@/components/modules/dashboard/LinksWidget'
import { NewsWidget } from '@/components/modules/dashboard/NewsWidget'
import { useMonthSummary } from '@/hooks/useFinancial'
import { useTodos } from '@/hooks/useTodos'
import { useWeb3 } from '@/hooks/useWeb3'
import { useLinks } from '@/hooks/useLinks'
import { useNotifications } from '@/hooks/useNotifications'
import { formatCurrency } from '@/utils/format'

const modules: BentoItem[] = [
    {
        id: 'financeiro',
        title: 'Controlo Financeiro',
        description: 'Receitas, despesas e saldo do mes atual.',
        icon: <DollarSign size={20} />,
        colSpan: 2,
        children: <FinancialWidget />,
    },
    {
        id: 'todo',
        title: 'To-Do',
        description: 'Tarefas pendentes e prioridades.',
        icon: <CheckSquare size={20} />,
        children: <TodoWidget />,
    },
    {
        id: 'links',
        title: 'Gestor de Links',
        description: 'Artigos para ler mais tarde.',
        icon: <Link2 size={20} />,
        children: <LinksWidget />,
    },
    {
        id: 'crypto',
        title: 'Ledger Cripto',
        description: 'Portfolio e ativos principais.',
        icon: <Bitcoin size={20} />,
        colSpan: 2,
        children: <CryptoWidget />,
    },
    {
        id: 'activity',
        title: 'Atividade Recente',
        description: 'Ultimas acoes sincronizadas.',
        icon: <Activity size={20} />,
    },
    {
        id: 'news',
        title: 'Noticias',
        description: 'Ultimas noticias curadas.',
        icon: <Newspaper size={20} />,
        children: <NewsWidget />,
    },
]

function useMarqueeItems() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary } = useMonthSummary(currentMonth)
    const { data: todos } = useTodos()
    const { portfolio } = useWeb3()
    const { data: links } = useLinks()
    const { unreadCount } = useNotifications()

    const pendingTasks = todos?.filter(t => t.status !== 'done')?.length ?? 0
    const totalPortfolio = portfolio.reduce((acc: number, a: any) => acc + (a.value || 0), 0)
    const totalLinks = links?.length ?? 0

    return [
        <MarqueeCard
            key="fin"
            icon={<DollarSign size={14} />}
            title="Financeiro"
            text={summary ? `Saldo: ${formatCurrency(summary.balance)}` : 'A carregar...'}
        />,
        <MarqueeCard
            key="todo"
            icon={<CheckSquare size={14} />}
            title="Produtividade"
            text={`${pendingTasks} tarefa${pendingTasks !== 1 ? 's' : ''} pendente${pendingTasks !== 1 ? 's' : ''}`}
        />,
        <MarqueeCard
            key="crypto"
            icon={<Bitcoin size={14} />}
            title="Cripto"
            text={totalPortfolio > 0 ? `Portfolio: ${formatCurrency(totalPortfolio)}` : 'Sem wallets'}
        />,
        <MarqueeCard
            key="links"
            icon={<Link2 size={14} />}
            title="Links"
            text={`${totalLinks} artigo${totalLinks !== 1 ? 's' : ''} ${totalLinks !== 1 ? 'salvos' : 'salvo'}`}
        />,
        <MarqueeCard
            key="notif"
            icon={<Bell size={14} />}
            title="Notificacoes"
            text={unreadCount > 0 ? `${unreadCount} alerta${unreadCount !== 1 ? 's' : ''}` : 'Tudo em dia'}
        />,
        <MarqueeCard
            key="buggy"
            icon={<Sparkles size={14} />}
            title="Buggy IA"
            text="Analise pronta"
        />,
    ]
}

export function DashboardPage() {
    const { user } = useAuth()
    const marqueeItems = useMarqueeItems()

    const greeting = getGreeting()

    return (
        <div className="min-h-screen pb-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full"
            >
                {/* Header */}
                <div className="mb-8">
                    <motion.h1
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)] mb-1.5"
                    >
                        {greeting}, <span className="text-[var(--color-accent)]">{user?.email?.split('@')[0]}</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15, duration: 0.4 }}
                        className="text-sm text-[var(--color-text-secondary)]"
                    >
                        Aqui esta o resumo do teu dia.
                    </motion.p>
                </div>

                {/* Infinite Marquee */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mb-8 -mx-4 md:-mx-6 lg:-mx-8 opacity-80 hover:opacity-100 transition-opacity"
                >
                    <InfiniteMarquee speed={40} items={marqueeItems} />
                </motion.div>

                {/* Bento Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <BentoGrid items={modules} />
                </motion.div>
            </motion.div>
        </div>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
}

function MarqueeCard({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl
            bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
            hover:border-[var(--color-accent)]/20 transition-colors">
            <span className="text-[var(--color-accent)]">{icon}</span>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-semibold tracking-[0.1em] text-[var(--color-text-muted)]">{title}</span>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{text}</span>
            </div>
        </div>
    )
}
