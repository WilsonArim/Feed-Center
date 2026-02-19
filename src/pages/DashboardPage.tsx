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
        description: 'Receitas, despesas e saldo do mês atual.',
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
        description: 'Últimas ações sincronizadas.',
        icon: <Activity size={20} />,
    },
    {
        id: 'news',
        title: 'Notícias',
        description: 'Últimas notícias curadas.',
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
            icon={<DollarSign size={14} />}
            title="Financeiro"
            text={summary ? `Saldo: ${formatCurrency(summary.balance)}` : 'A carregar...'}
        />,
        <MarqueeCard
            icon={<CheckSquare size={14} />}
            title="Produtividade"
            text={`${pendingTasks} tarefa${pendingTasks !== 1 ? 's' : ''} pendente${pendingTasks !== 1 ? 's' : ''}`}
        />,
        <MarqueeCard
            icon={<Bitcoin size={14} />}
            title="Cripto"
            text={totalPortfolio > 0 ? `Portfolio: ${formatCurrency(totalPortfolio)}` : 'Sem wallets'}
        />,
        <MarqueeCard
            icon={<Link2 size={14} />}
            title="Links"
            text={`${totalLinks} artigo${totalLinks !== 1 ? 's' : ''} ${totalLinks !== 1 ? 'salvos' : 'salvo'}`}
        />,
        <MarqueeCard
            icon={<Bell size={14} />}
            title="Notificações"
            text={unreadCount > 0 ? `${unreadCount} alerta${unreadCount !== 1 ? 's' : ''}` : 'Tudo em dia ✓'}
        />,
        <MarqueeCard
            icon={<Sparkles size={14} />}
            title="Buggy IA"
            text="Análise pronta"
        />,
    ]
}

export function DashboardPage() {
    const { user } = useAuth()
    const marqueeItems = useMarqueeItems()

    return (
        <div className="min-h-screen pt-24 px-6 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
            >
                {/* Header */}
                <div className="mb-10">
                    <h1
                        className="text-4xl font-bold tracking-tight mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Dashboard
                    </h1>
                    <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                        Bem-vindo, <strong>{user?.email?.split('@')[0]}</strong>
                    </p>
                </div>

                {/* Infinite Marquee - Dynamic Data */}
                <div className="mb-12 -mx-6 md:-mx-0 opacity-80 hover:opacity-100 transition-opacity">
                    <InfiniteMarquee speed={40} items={marqueeItems} />
                </div>

                {/* Bento Grid */}
                <BentoGrid items={modules} />
            </motion.div>
        </div>
    )
}

function MarqueeCard({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-[var(--color-border)]">
            <span className="text-[var(--color-accent)]">{icon}</span>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)]">{title}</span>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{text}</span>
            </div>
        </div>
    )
}
