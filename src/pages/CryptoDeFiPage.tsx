import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Droplets, Coins, ArrowDownUp, Loader2 } from 'lucide-react'
import { useDefiPositions } from '@/hooks/useDefiPositions'
import { AddPoolModal } from '@/components/modules/defi/AddPoolModal'
import { AddStakeModal } from '@/components/modules/defi/AddStakeModal'
import { AddBorrowLendModal } from '@/components/modules/defi/AddBorrowLendModal'
import { PoolPositionCard } from '@/components/modules/defi/PoolPositionCard'
import { TokenPositionCard } from '@/components/modules/defi/TokenPositionCard'
import type { DefiPositionType } from '@/types'
import { NextActionsStrip, PageHeader, PageSectionHeader, StateCard } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

type Tab = 'pool' | 'stake' | 'borrow-lend'

const TABS: { id: Tab; label: string; icon: typeof Droplets; types: DefiPositionType[] }[] = [
    { id: 'pool', label: 'Pools', icon: Droplets, types: ['pool'] },
    { id: 'stake', label: 'Stake', icon: Coins, types: ['stake'] },
    { id: 'borrow-lend', label: 'Borrow / Lend', icon: ArrowDownUp, types: ['borrow', 'lend'] },
]

export function CryptoDeFiPage() {
    const { txt } = useLocaleText()
    const [tab, setTab] = useState<Tab>('pool')
    const [showPoolModal, setShowPoolModal] = useState(false)
    const [showStakeModal, setShowStakeModal] = useState(false)
    const [showBorrowLendModal, setShowBorrowLendModal] = useState(false)

    const { positions, createPool, createStake, createBorrowLend, close, remove } = useDefiPositions()

    const tabConfig = TABS.find(t => t.id === tab)!

    const filtered = useMemo(() => {
        const all = positions.data ?? []
        return all.filter(p => tabConfig.types.includes(p.type))
    }, [positions.data, tabConfig.types])

    const active = filtered.filter(p => p.status === 'active')
    const closed = filtered.filter(p => p.status === 'closed')

    const totalValue = useMemo(() => {
        return active.reduce((sum, p) => {
            if (p.type === 'pool') return sum + (p.initial_value_usd ?? 0)
            return sum + (p.token_amount ?? 0) * (p.token_price_at_entry ?? 0)
        }, 0)
    }, [active])

    const handleOpenModal = () => {
        if (tab === 'pool') setShowPoolModal(true)
        else if (tab === 'stake') setShowStakeModal(true)
        else setShowBorrowLendModal(true)
    }

    const handleClose = (id: string, closeValueUsd: number) => {
        close.mutate({ id, closeValueUsd })
    }

    const handleDelete = (id: string) => {
        remove.mutate(id)
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-40 flex flex-col gap-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-6"
            >
                {/* Header */}
                <PageHeader
                    icon={<Droplets size={18} />}
                    title={txt('Ledger DeFi', 'DeFi Ledger')}
                    subtitle={txt('Monitora pools, staking e borrow/lend num unico cockpit.', 'Monitor pools, staking, and borrow/lend in a single cockpit.')}
                    meta={`${active.length} ${txt('posicoes ativas', 'active positions')} | ${closed.length} ${txt('no historico', 'in history')}`}
                    actions={(
                        <Magnetic strength={0.2}>
                            <button
                                onClick={handleOpenModal}
                                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_0_20px_rgba(255,90,0,0.3)] hover:shadow-[0_0_30px_rgba(255,90,0,0.5)] active:scale-95 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} /> {txt('Adicionar', 'Add')}
                            </button>
                        </Magnetic>
                    )}
                />

                {/* Tabs */}
                <div className="flex gap-2 p-1 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 w-fit">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer justify-center ${tab === t.id
                                ? 'bg-white text-black shadow-lg scale-105'
                                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <t.icon size={16} strokeWidth={tab === t.id ? 2.5 : 2} />
                            <span className="hidden md:inline">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Summary stats */}
                <PageSectionHeader
                    title={txt('Resumo de Exposicao', 'Exposure Summary')}
                    subtitle={txt('Volume ativo e historico das tuas operacoes DeFi.', 'Active volume and history of your DeFi operations.')}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-4 mb-8">
                    <div className="flex flex-col justify-center min-h-[120px]">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-[var(--color-text-muted)] drop-shadow-sm">{txt('Posicoes Ativas', 'Active Positions')}</p>
                        <p className="text-5xl font-black text-white drop-shadow-md tabular-nums">{active.length}</p>
                    </div>
                    <div className="relative flex flex-col justify-center min-h-[120px]">
                        <div className="absolute top-1/2 left-0 w-24 h-24 bg-[var(--accent)]/10 rounded-full blur-[30px] -translate-y-1/2" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-[var(--color-text-muted)] drop-shadow-sm z-10">{txt('Valor Total (Entrada)', 'Total Value (Entry)')}</p>
                        <p className="text-5xl md:text-6xl font-black text-[var(--accent)] tracking-tighter drop-shadow-md z-10 tabular-nums">
                            ${totalValue.toFixed(2)}
                        </p>
                    </div>
                    <div className="flex flex-col justify-center min-h-[120px]">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-[var(--color-text-muted)] drop-shadow-sm">{txt('Historico', 'History')}</p>
                        <p className="text-5xl font-black text-[var(--color-text-secondary)] drop-shadow-md tabular-nums">{closed.length}</p>
                    </div>
                </div>

                {/* Loading */}
                {positions.isLoading && (
                    <div className="flex justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                    </div>
                )}

                {/* Active positions */}
                {!positions.isLoading && active.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            {txt('Posicoes Ativas', 'Active Positions')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {active.map((pos, i) => (
                                tab === 'pool' ? (
                                    <PoolPositionCard key={pos.id} position={pos} index={i}
                                        onClose={handleClose} onDelete={handleDelete} />
                                ) : (
                                    <TokenPositionCard key={pos.id} position={pos} index={i}
                                        onClose={handleClose} onDelete={handleDelete} />
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Closed positions */}
                {!positions.isLoading && closed.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            {txt('Historico', 'History')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {closed.map((pos, i) => (
                                tab === 'pool' ? (
                                    <PoolPositionCard key={pos.id} position={pos} index={i}
                                        onClose={handleClose} onDelete={handleDelete} />
                                ) : (
                                    <TokenPositionCard key={pos.id} position={pos} index={i}
                                        onClose={handleClose} onDelete={handleDelete} />
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!positions.isLoading && filtered.length === 0 && (
                    <StateCard
                        title={txt(`Sem posicoes de ${tabConfig.label.toLowerCase()} registadas`, `No ${tabConfig.label.toLowerCase()} positions recorded`)}
                        message={txt('Adiciona a primeira posicao para acompanhar performance e risco desde o inicio.', 'Add your first position to track performance and risk from day one.')}
                        icon={<tabConfig.icon size={18} />}
                        actionLabel={txt('Adicionar primeira posicao', 'Add first position')}
                        onAction={handleOpenModal}
                    />
                )}

                <NextActionsStrip
                    title={txt('Proximo passo sugerido em DeFi', 'Suggested next step in DeFi')}
                    actions={[
                        { label: txt('Adicionar posicao', 'Add position'), to: '/crypto/defi' },
                        { label: txt('Rever carteira spot', 'Review spot portfolio'), to: '/crypto' },
                        { label: txt('Atualizar tarefas', 'Update tasks'), to: '/todo' },
                    ]}
                />
            </motion.div>

            <AddPoolModal
                isOpen={showPoolModal}
                onClose={() => setShowPoolModal(false)}
                onSubmit={(input) => { createPool.mutate(input); setShowPoolModal(false) }}
                isLoading={createPool.isPending}
            />
            <AddStakeModal
                isOpen={showStakeModal}
                onClose={() => setShowStakeModal(false)}
                onSubmit={(input) => { createStake.mutate(input); setShowStakeModal(false) }}
                isLoading={createStake.isPending}
            />
            <AddBorrowLendModal
                isOpen={showBorrowLendModal}
                onClose={() => setShowBorrowLendModal(false)}
                onSubmit={(input) => { createBorrowLend.mutate(input); setShowBorrowLendModal(false) }}
                isLoading={createBorrowLend.isPending}
            />
        </div>
    )
}
