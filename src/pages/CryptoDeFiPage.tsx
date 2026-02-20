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

type Tab = 'pool' | 'stake' | 'borrow-lend'

const TABS: { id: Tab; label: string; icon: typeof Droplets; types: DefiPositionType[] }[] = [
    { id: 'pool', label: 'Pools', icon: Droplets, types: ['pool'] },
    { id: 'stake', label: 'Stake', icon: Coins, types: ['stake'] },
    { id: 'borrow-lend', label: 'Borrow / Lend', icon: ArrowDownUp, types: ['borrow', 'lend'] },
]

export function CryptoDeFiPage() {
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
        <div className="p-6 pt-20 w-full flex flex-col gap-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-6"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1 text-[var(--color-text-primary)] font-sans">
                            Ledger DeFi
                        </h1>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Pools, Stake e Borrow/Lend -- acompanhe todas as suas posicoes DeFi.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
                    >
                        <Plus size={16} /> Adicionar
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer justify-center ${
                                tab === t.id
                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-md'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                            }`}
                        >
                            <t.icon size={14} />
                            <span className="hidden md:inline">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Posicoes Ativas</p>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">{active.length}</p>
                    </div>
                    <div className="p-4 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Valor Total (Entrada)</p>
                        <p className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
                            ${totalValue.toFixed(2)}
                        </p>
                    </div>
                    <div className="p-4 text-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Historico</p>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">{closed.length}</p>
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
                            Posicoes Ativas
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
                            Historico
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
                    <div className="text-center py-16">
                        <tabConfig.icon size={40} className="mx-auto text-[var(--color-text-muted)] opacity-20 mb-4" />
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">
                            Sem posicoes de {tabConfig.label.toLowerCase()} registadas.
                        </p>
                        <button
                            onClick={handleOpenModal}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30 transition-colors"
                        >
                            <Plus size={14} /> Adicionar primeira posicao
                        </button>
                    </div>
                )}
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
