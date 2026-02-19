import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
    Trash2, X, RefreshCw, Hash, PenLine
} from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { AddWalletModal } from '@/components/modules/crypto/AddWalletModal'
import { AddTransactionModal } from '@/components/modules/crypto/AddTransactionModal'
import { useWeb3 } from '@/hooks/useWeb3'
import type { UnifiedAsset, CryptoTransaction } from '@/types'
import { formatCurrency } from '@/utils/format'
import { PortfolioDonut } from '@/components/modules/crypto/PortfolioDonut'

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    buy: { label: 'Compra', color: 'text-green-400' },
    sell: { label: 'Venda', color: 'text-red-400' },
    swap: { label: 'Swap', color: 'text-blue-400' },
    airdrop: { label: 'Airdrop', color: 'text-yellow-400' },
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
        <div className="p-6 pt-20 w-full space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Ledger Cripto
                    </h1>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{wallets.data?.length ?? 0} Carteira{(wallets.data?.length ?? 0) !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{portfolio.length} Ativo{portfolio.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>Preços CoinGecko (60s)</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <StardustButton size="sm" variant="ghost" onClick={() => setAddWalletOpen(true)}>
                        + Carteira
                    </StardustButton>
                    <StardustButton size="sm" icon={<Plus size={16} />} onClick={() => setAddTxOpen(true)} disabled={!hasWallets}>
                        Nova Transação
                    </StardustButton>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Portfolio Total */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass p-6 rounded-[var(--radius-xl)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">Portfolio</p>
                    <h2 className="text-4xl font-bold tracking-tighter">{formatCurrency(totalBalance)}</h2>
                </motion.div>

                {/* Unrealized PnL */}
                <div className="glass p-6 rounded-[var(--radius-xl)]">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">PnL Não Realizado</p>
                    <div className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${totalUnrealized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalUnrealized >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {formatCurrency(totalUnrealized)}
                    </div>
                    <p className="text-[10px] opacity-40 mt-1">Baseado no preço atual vs preço médio de compra</p>
                </div>

                {/* Realized PnL */}
                <div className="glass p-6 rounded-[var(--radius-xl)]">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">PnL Realizado</p>
                    <div className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${totalRealized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalRealized >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {formatCurrency(totalRealized)}
                    </div>
                    <p className="text-[10px] opacity-40 mt-1">Lucro/prejuízo de vendas e swaps</p>
                </div>
            </div>

            {/* Wallets sidebar */}
            <div className="glass p-4 rounded-[var(--radius-xl)]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm opacity-70">Carteiras</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {wallets.data?.map(w => (
                        <div key={w.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs">
                            <span className={`w-2 h-2 rounded-full ${w.chain_type === 'solana' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                            <span className="truncate max-w-[100px]">{w.label || w.address.slice(0, 6) + '...'}</span>
                            <button onClick={() => deleteWallet.mutate(w.id)} className="hover:text-red-400 opacity-50 hover:opacity-100 cursor-pointer">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    {!hasWallets && <p className="text-xs opacity-40 italic">Adiciona uma carteira para começar.</p>}
                </div>
            </div>

            {/* Holdings Table */}
            <div className="glass rounded-[var(--radius-xl)] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold">Holdings</h3>
                    <span className="text-xs opacity-50">Calculados automaticamente a partir das transações</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-[var(--color-text-muted)] text-[10px] uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3"></th>
                                <th className="px-6 py-3">Ativo</th>
                                <th className="px-6 py-3 text-right">Preço</th>
                                <th className="px-6 py-3 text-right">24h</th>
                                <th className="px-6 py-3 text-right">Quantidade</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 text-right">Custo Médio</th>
                                <th className="px-6 py-3 text-right">PnL</th>
                                <th className="px-6 py-3 text-center">Txs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingPortfolio ? (
                                <tr><td colSpan={9} className="p-8 text-center opacity-50">
                                    <RefreshCw size={18} className="animate-spin inline mr-2" /> A carregar...
                                </td></tr>
                            ) : portfolio.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center opacity-50">
                                    {hasWallets ? 'Nenhuma transação registada.' : 'Adiciona uma carteira primeiro.'}
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

            {/* Donut Chart */}
            <PortfolioDonut />

            {/* Modals */}
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

// ─── Asset Row with expandable transaction history ───

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
            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onToggle}>
                <td className="px-6 py-4">
                    <button className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        {asset.image && <img src={asset.image} alt="" className="w-8 h-8 rounded-full bg-white/10" />}
                        <div>
                            <div className="font-bold">{asset.name}</div>
                            <div className="text-xs opacity-50">{asset.symbol}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-right tabular-nums opacity-80">
                    {hasPrice ? formatCurrency(asset.price) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                    {hasPrice ? (
                        <span className={`text-xs font-medium ${asset.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                <td className="px-6 py-4 text-right tabular-nums opacity-80">
                    {asset.avg_buy_price > 0 ? formatCurrency(asset.avg_buy_price) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                    {asset.avg_buy_price > 0 && hasPrice ? (
                        <div className={`flex flex-col items-end tabular-nums ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <span className="font-bold">{formatCurrency(asset.unrealized_pnl)}</span>
                            <span className="text-xs opacity-80">{fmtPct(asset.unrealized_pnl_percent)}</span>
                        </div>
                    ) : <span className="text-xs opacity-20">-</span>}
                </td>
                <td className="px-6 py-4 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 font-mono">{asset.transaction_count}</span>
                </td>
            </tr>

            {/* Expanded: Transaction History */}
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
                                <div className="px-8 py-4 bg-white/[0.015] border-b border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold uppercase tracking-widest opacity-50">
                                            Histórico de Transações — {asset.symbol}
                                        </h4>
                                        {asset.realized_pnl !== 0 && (
                                            <span className={`text-xs font-medium ${asset.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                PnL Realizado: {formatCurrency(asset.realized_pnl)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
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
    const typeInfo = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'text-white/50' }

    return (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-[var(--radius-md)] bg-white/[0.03] hover:bg-white/[0.05] transition-colors group text-xs">
            {/* Source Badge */}
            <span title={tx.source === 'hash_verified' ? 'Hash Verified' : 'Manual'}>
                {tx.source === 'hash_verified'
                    ? <Hash size={12} className="text-emerald-400" />
                    : <PenLine size={12} className="text-white/30" />
                }
            </span>

            {/* Type */}
            <span className={`font-bold w-16 ${typeInfo.color}`}>{typeInfo.label}</span>

            {/* Date */}
            <span className="opacity-50 w-20">{fmtDate(tx.executed_at)}</span>

            {/* Quantity + Price */}
            <span className="tabular-nums font-medium flex-1">
                {tx.quantity.toLocaleString('pt-PT', { maximumFractionDigits: 6 })} {tx.symbol}
                {tx.price_per_unit ? (
                    <span className="opacity-40 ml-2">@ {formatCurrency(tx.price_per_unit)}</span>
                ) : null}
            </span>

            {/* Exchange */}
            {tx.exchange && <span className="opacity-30">{tx.exchange}</span>}

            {/* Fee */}
            {tx.fee && tx.fee > 0 && (
                <span className="opacity-30">fee: {formatCurrency(tx.fee)}</span>
            )}

            {/* Hash snippet */}
            {tx.tx_hash && (
                <span className="font-mono opacity-20 truncate max-w-[80px]" title={tx.tx_hash}>
                    {tx.tx_hash.slice(0, 8)}...
                </span>
            )}

            {/* Delete */}
            <button
                onClick={e => { e.stopPropagation(); onDelete(tx.id) }}
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-red-400 transition-all cursor-pointer"
            >
                <Trash2 size={12} />
            </button>
        </div>
    )
}
