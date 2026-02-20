import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
    Trash2, X, RefreshCw, Hash, PenLine, Bitcoin
} from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { AddWalletModal } from '@/components/modules/crypto/AddWalletModal'
import { AddTransactionModal } from '@/components/modules/crypto/AddTransactionModal'
import { useWeb3 } from '@/hooks/useWeb3'
import type { UnifiedAsset, CryptoTransaction } from '@/types'
import { formatCurrency } from '@/utils/format'
import { PortfolioDonut } from '@/components/modules/crypto/PortfolioDonut'
import { NextActionsStrip, PageHeader, PageSectionHeader } from '@/components/core/PagePrimitives'

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    buy: { label: 'Compra', color: 'text-emerald-400' },
    sell: { label: 'Venda', color: 'text-rose-400' },
    swap: { label: 'Swap', color: 'text-blue-400' },
    airdrop: { label: 'Airdrop', color: 'text-amber-400' },
    transfer_in: { label: 'Transfer', color: 'text-cyan-400' },
}

export function CryptoPage() {
    const {
        wallets, portfolio, isLoadingPortfolio,
        addWallet, deleteWallet, addTransaction, deleteTransaction,
    } = useWeb3()

    const [isAddWalletOpen, setAddWalletOpen] = useState(false)
    const [isAddTxOpen, setAddTxOpen] = useState(false)
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)

    const totalBalance = portfolio.reduce((sum, a) => sum + a.value, 0)
    const totalUnrealized = portfolio.reduce((sum, a) => sum + a.unrealized_pnl, 0)
    const totalRealized = portfolio.reduce((sum, a) => sum + a.realized_pnl, 0)
    const hasWallets = (wallets.data?.length ?? 0) > 0

    return (
        <div className="w-full flex flex-col gap-8 pb-12">

            {/* Header */}
            <PageHeader
                icon={<Bitcoin size={18} />}
                title="Ledger Cripto"
                subtitle="Acompanha exposicao, PnL e historico com contexto de decisao."
                meta={`${wallets.data?.length ?? 0} carteira${(wallets.data?.length ?? 0) !== 1 ? 's' : ''} | ${portfolio.length} ativo${portfolio.length !== 1 ? 's' : ''}`}
                actions={(
                    <>
                        <StardustButton size="sm" variant="ghost" onClick={() => setAddWalletOpen(true)}>
                            + Carteira
                        </StardustButton>
                        <StardustButton size="sm" icon={<Plus size={16} />} onClick={() => setAddTxOpen(true)} disabled={!hasWallets}>
                            Nova Transacao
                        </StardustButton>
                    </>
                )}
            />

            {/* Stats Row */}
            <PageSectionHeader
                title="Snapshot de Performance"
                subtitle="Visao rapida do valor total e dos resultados realizados e nao realizados."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-accent)]/5 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--color-text-muted)]">Portfolio</p>
                    <h2 className="text-4xl font-bold tracking-tighter text-[var(--color-text-primary)]">{formatCurrency(totalBalance)}</h2>
                </motion.div>

                <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--color-text-muted)]">PnL Nao Realizado</p>
                    <div className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${totalUnrealized >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {totalUnrealized >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {formatCurrency(totalUnrealized)}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Baseado no preco atual vs preco medio de compra</p>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--color-text-muted)]">PnL Realizado</p>
                    <div className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${totalRealized >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {totalRealized >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {formatCurrency(totalRealized)}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Lucro/prejuizo de vendas e swaps</p>
                </div>
            </div>

            {/* Wallets */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-[var(--color-text-secondary)]">Carteiras</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {wallets.data?.map(w => (
                        <div key={w.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                            <span className={`w-2 h-2 rounded-full ${w.chain_type === 'solana' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                            <span className="truncate max-w-[100px]">{w.label || w.address.slice(0, 6) + '...'}</span>
                            <button onClick={() => deleteWallet.mutate(w.id)} className="hover:text-rose-400 text-[var(--color-text-muted)] hover:opacity-100 cursor-pointer transition-colors">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    {!hasWallets && <p className="text-xs text-[var(--color-text-muted)] italic">Adiciona uma carteira para comecar.</p>}
                </div>
            </div>

            {/* Holdings Table */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h3 className="font-bold text-[var(--color-text-primary)]">Holdings</h3>
                    <span className="text-xs text-[var(--color-text-muted)]">Calculados automaticamente a partir das transacoes</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] text-[10px] uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3"></th>
                                <th className="px-6 py-3">Ativo</th>
                                <th className="px-6 py-3 text-right">Preco</th>
                                <th className="px-6 py-3 text-right">24h</th>
                                <th className="px-6 py-3 text-right">Quantidade</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 text-right">Custo Medio</th>
                                <th className="px-6 py-3 text-right">PnL</th>
                                <th className="px-6 py-3 text-center">Txs</th>
                            </tr>
                        </thead>
                        <tbody className="text-[var(--color-text-primary)]">
                            {isLoadingPortfolio ? (
                                <tr><td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">
                                    <RefreshCw size={18} className="animate-spin inline mr-2" /> A carregar...
                                </td></tr>
                            ) : portfolio.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center text-[var(--color-text-muted)]">
                                    {hasWallets ? 'Nenhuma transacao registada.' : 'Adiciona uma carteira primeiro.'}
                                </td></tr>
                            ) : portfolio.map((asset: UnifiedAsset) => {
                                const isExpanded = expandedSymbol === asset.symbol
                                return (
                                    <AssetRow
                                        key={asset.symbol}
                                        asset={asset}
                                        isExpanded={isExpanded}
                                        onToggle={() => setExpandedSymbol(isExpanded ? null : asset.symbol)}
                                        onDeleteTx={(id) => deleteTransaction.mutate(id)}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <PortfolioDonut />

            <NextActionsStrip
                title="Proxima acao recomendada para a tua carteira"
                actions={[
                    { label: 'Adicionar transacao', to: '/crypto' },
                    { label: 'Abrir DeFi', to: '/crypto/defi' },
                    { label: 'Rever noticias', to: '/news' },
                ]}
            />

            <AddWalletModal
                isOpen={isAddWalletOpen}
                onClose={() => setAddWalletOpen(false)}
                onSubmit={data => addWallet.mutate(data, { onSuccess: () => setAddWalletOpen(false) })}
                isLoading={addWallet.isPending}
            />
            <AddTransactionModal
                isOpen={isAddTxOpen}
                onClose={() => setAddTxOpen(false)}
                onSubmit={data => addTransaction.mutate(data, { onSuccess: () => setAddTxOpen(false) })}
                isLoading={addTransaction.isPending}
                wallets={wallets.data ?? []}
            />
        </div>
    )
}

function AssetRow({ asset, isExpanded, onToggle, onDeleteTx }: {
    asset: UnifiedAsset
    isExpanded: boolean
    onToggle: () => void
    onDeleteTx: (id: string) => void
}) {
    const totalPnl = asset.unrealized_pnl + asset.realized_pnl
    const hasPrice = asset.price > 0

    return (
        <>
            <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]/50 transition-colors cursor-pointer" onClick={onToggle}>
                <td className="px-6 py-4">
                    <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        {asset.image && <img src={asset.image} alt="" className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)]" />}
                        <div>
                            <div className="font-bold text-[var(--color-text-primary)]">{asset.name}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">{asset.symbol}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-[var(--color-text-secondary)]">
                    {hasPrice ? formatCurrency(asset.price) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                    {hasPrice ? (
                        <span className={`text-xs font-medium ${asset.price_change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {fmtPct(asset.price_change_24h)}
                        </span>
                    ) : '-'}
                </td>
                <td className="px-6 py-4 text-right tabular-nums font-medium">
                    {asset.quantity.toLocaleString('pt-PT', { maximumFractionDigits: 6 })}
                </td>
                <td className="px-6 py-4 text-right tabular-nums font-bold">
                    {hasPrice ? formatCurrency(asset.value) : '-'}
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-[var(--color-text-secondary)]">
                    {asset.avg_buy_price > 0 ? formatCurrency(asset.avg_buy_price) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                    {asset.avg_buy_price > 0 && hasPrice ? (
                        <div className={`flex flex-col items-end tabular-nums ${totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span className="font-bold">{formatCurrency(asset.unrealized_pnl)}</span>
                            <span className="text-xs opacity-80">{fmtPct(asset.unrealized_pnl_percent)}</span>
                        </div>
                    ) : <span className="text-xs text-[var(--color-text-muted)]">-</span>}
                </td>
                <td className="px-6 py-4 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] font-mono text-[var(--color-text-muted)]">{asset.transaction_count}</span>
                </td>
            </tr>

            <AnimatePresence>
                {isExpanded && (
                    <tr>
                        <td colSpan={9} className="p-0">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-8 py-4 bg-[var(--color-bg-tertiary)]/30 border-b border-[var(--color-border)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                                            Historico de Transacoes -- {asset.symbol}
                                        </h4>
                                        {asset.realized_pnl !== 0 && (
                                            <span className={`text-xs font-medium ${asset.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                PnL Realizado: {formatCurrency(asset.realized_pnl)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {asset.transactions.map((tx: CryptoTransaction) => (
                                            <TransactionRow key={tx.id} tx={tx} onDelete={onDeleteTx} />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    )
}

function TransactionRow({ tx, onDelete }: { tx: CryptoTransaction; onDelete: (id: string) => void }) {
    const typeInfo = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'text-[var(--color-text-muted)]' }

    return (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/20 transition-colors group text-xs">
            <span title={tx.source === 'hash_verified' ? 'Hash Verified' : 'Manual'}>
                {tx.source === 'hash_verified'
                    ? <Hash size={12} className="text-emerald-400" />
                    : <PenLine size={12} className="text-[var(--color-text-muted)]" />
                }
            </span>
            <span className={`font-bold w-16 ${typeInfo.color}`}>{typeInfo.label}</span>
            <span className="text-[var(--color-text-muted)] w-20">{fmtDate(tx.executed_at)}</span>
            <span className="tabular-nums font-medium flex-1 text-[var(--color-text-primary)]">
                {tx.quantity.toLocaleString('pt-PT', { maximumFractionDigits: 6 })} {tx.symbol}
                {tx.price_per_unit ? (
                    <span className="text-[var(--color-text-muted)] ml-2">@ {formatCurrency(tx.price_per_unit)}</span>
                ) : null}
            </span>
            {tx.exchange && <span className="text-[var(--color-text-muted)]">{tx.exchange}</span>}
            {tx.fee && tx.fee > 0 && (
                <span className="text-[var(--color-text-muted)]">fee: {formatCurrency(tx.fee)}</span>
            )}
            {tx.tx_hash && (
                <span className="font-mono text-[var(--color-text-muted)] truncate max-w-[80px] opacity-50" title={tx.tx_hash}>
                    {tx.tx_hash.slice(0, 8)}...
                </span>
            )}
            <button
                onClick={e => { e.stopPropagation(); onDelete(tx.id) }}
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-rose-400 transition-all cursor-pointer text-[var(--color-text-muted)]"
            >
                <Trash2 size={12} />
            </button>
        </div>
    )
}
