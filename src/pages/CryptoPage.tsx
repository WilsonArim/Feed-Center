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
import { NextActionsStrip, PageHeader, PageSectionHeader, StateCard } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const fmtDate = (d: string, locale: string) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })

const TX_TYPE_COLORS: Record<string, string> = {
    buy: 'text-emerald-400',
    sell: 'text-rose-400',
    swap: 'text-blue-400',
    airdrop: 'text-amber-400',
    transfer_in: 'text-cyan-400',
}

export function CryptoPage() {
    const { txt } = useLocaleText()
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
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-40 flex flex-col gap-8">

            {/* Header */}
            <PageHeader
                icon={<Bitcoin size={18} />}
                title={txt('Ledger Cripto', 'Crypto Ledger')}
                subtitle={txt('Acompanha exposicao, PnL e historico com contexto de decisao.', 'Track exposure, PnL, and history with decision context.')}
                meta={`${wallets.data?.length ?? 0} ${txt('carteira', 'wallet')}${(wallets.data?.length ?? 0) !== 1 ? 's' : ''} | ${portfolio.length} ${txt('ativo', 'asset')}${portfolio.length !== 1 ? 's' : ''}`}
                actions={(
                    <>
                        <StardustButton size="sm" variant="ghost" onClick={() => setAddWalletOpen(true)}>
                            + {txt('Carteira', 'Wallet')}
                        </StardustButton>
                        <StardustButton size="sm" icon={<Plus size={16} />} onClick={() => setAddTxOpen(true)} disabled={!hasWallets}>
                            {txt('Nova Transacao', 'New Transaction')}
                        </StardustButton>
                    </>
                )}
            />

            {/* Stats Row */}
            <PageSectionHeader
                title={txt('Snapshot de Performance', 'Performance Snapshot')}
                subtitle={txt('Visao rapida do valor total e dos resultados realizados e nao realizados.', 'Quick view of total value and realized/unrealized results.')}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-4 mb-12">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="relative flex flex-col justify-center min-h-[140px]">
                    <div className="absolute top-1/2 left-0 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-[40px] -translate-y-1/2" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 text-[var(--color-text-muted)] drop-shadow-sm z-10">{txt('Portfolio', 'Portfolio')}</p>
                    <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md z-10 tabular-nums">{formatCurrency(totalBalance)}</h2>
                </motion.div>

                <div className="flex flex-col justify-center min-h-[140px]">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 text-[var(--color-text-muted)] drop-shadow-sm">{txt('PnL Nao Realizado', 'Unrealized PnL')}</p>
                    <div className={`text-4xl font-black tracking-tighter flex items-center gap-3 drop-shadow-md tabular-nums ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalUnrealized >= 0 ? <TrendingUp size={28} strokeWidth={3} /> : <TrendingDown size={28} strokeWidth={3} />}
                        {formatCurrency(totalUnrealized)}
                    </div>
                </div>

                <div className="flex flex-col justify-center min-h-[140px]">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 text-[var(--color-text-muted)] drop-shadow-sm">{txt('PnL Realizado', 'Realized PnL')}</p>
                    <div className={`text-4xl font-black tracking-tighter flex items-center gap-3 drop-shadow-md tabular-nums ${totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalRealized >= 0 ? <TrendingUp size={28} strokeWidth={3} /> : <TrendingDown size={28} strokeWidth={3} />}
                        {formatCurrency(totalRealized)}
                    </div>
                </div>
            </div>

            {/* Wallets */}
            <div className="py-2">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-white drop-shadow-sm">{txt('Carteiras Activas', 'Active Wallets')}</h3>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {wallets.data?.map(w => (
                        <div key={w.id} className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20">
                            <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] opacity-80 ${w.chain_type === 'solana' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                            <span className="truncate max-w-[120px]">{w.label || w.address.slice(0, 6) + '...'}</span>
                            <button onClick={() => deleteWallet.mutate(w.id)} className="ml-1 p-1 hover:bg-rose-500/20 text-[var(--color-text-muted)] hover:text-rose-400 rounded-full cursor-pointer transition-all">
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                    {!hasWallets && <p className="text-sm text-[var(--color-text-muted)] italic py-2">{txt('Nenhuma carteira conectada.', 'No wallets connected.')}</p>}
                </div>
            </div>

            {/* Holdings Table */}
            <div className="mt-8 mb-16">
                <div className="flex items-baseline justify-between mb-6">
                    <h3 className="text-2xl font-black text-white drop-shadow-md tracking-tight">{txt('Ativos', 'Assets')}</h3>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">{portfolio.length} {txt('registados', 'recorded')}</span>
                </div>

                {portfolio.length === 0 && !isLoadingPortfolio ? (
                    <div className="py-12">
                        <StateCard
                            title={hasWallets ? txt('Nenhuma transacao registada', 'No transactions recorded') : txt('Adiciona uma carteira para comecar', 'Add a wallet to get started')}
                            message={hasWallets
                                ? txt('Depois de registares transacoes, os holdings aparecem aqui.', 'After you record transactions, holdings will appear here.')
                                : txt('Liga uma carteira read-only para ativar o teu ledger cripto.', 'Connect a read-only wallet to activate your crypto ledger.')}
                            icon={<Bitcoin size={24} />}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-white/10 text-[10px] uppercase font-black text-[var(--color-text-muted)] tracking-[0.2em]">
                                    <th className="px-4 py-4 w-12 text-center"></th>
                                    <th className="px-4 py-4">{txt('Ativo', 'Asset')}</th>
                                    <th className="px-4 py-4 text-right">{txt('Preco', 'Price')}</th>
                                    <th className="px-4 py-4 text-right">24h</th>
                                    <th className="px-4 py-4 text-right">{txt('Quantidade', 'Quantity')}</th>
                                    <th className="px-4 py-4 text-right">{txt('Valor', 'Value')}</th>
                                    <th className="px-4 py-4 text-right">{txt('Custo Medio', 'Avg Cost')}</th>
                                    <th className="px-4 py-4 text-right">PnL</th>
                                    <th className="px-4 py-4 text-center">Txs</th>
                                </tr>
                            </thead>
                            <tbody className="group/table">
                                {isLoadingPortfolio ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">
                                        <RefreshCw size={18} className="animate-spin inline mr-2" /> {txt('A carregar...', 'Loading...')}
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
                )}
            </div>

            <PortfolioDonut />

            <NextActionsStrip
                title={txt('Proxima acao recomendada para a tua carteira', 'Next recommended action for your portfolio')}
                actions={[
                    { label: txt('Adicionar transacao', 'Add transaction'), to: '/crypto' },
                    { label: 'Abrir DeFi', to: '/crypto/defi' },
                    { label: txt('Rever noticias', 'Review news'), to: '/news' },
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
    const { txt, isEnglish } = useLocaleText()
    const totalPnl = asset.unrealized_pnl + asset.realized_pnl
    const hasPrice = asset.price > 0

    return (
        <>
            <tr
                className="group relative border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-all duration-500
                [&>*:not(:hover)]:group-hover/table:opacity-20 [&>*:not(:hover)]:group-hover/table:blur-[4px] [&>*:not(:hover)]:group-hover/table:brightness-50"
                onClick={onToggle}
            >
                <td className="px-4 py-5 w-12 text-center text-[var(--color-text-muted)]">
                    <button className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--color-text-muted)] group-hover:text-white cursor-pointer">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </td>
                <td className="px-4 py-5">
                    <div className="flex items-center gap-4">
                        {asset.image ? (
                            <img src={asset.image} alt="" className="w-10 h-10 rounded-full object-cover shadow-[0_2px_10px_rgba(0,0,0,0.5)]" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm text-white/50">{asset.symbol[0]}</div>
                        )}
                        <div>
                            <div className="font-bold text-base text-white drop-shadow-sm">{asset.name}</div>
                            <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--color-text-muted)] uppercase">{asset.symbol}</div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-5 text-right tabular-nums text-sm font-medium text-[var(--color-text-secondary)]">
                    {hasPrice ? formatCurrency(asset.price) : '-'}
                </td>
                <td className="px-4 py-5 text-right">
                    {hasPrice ? (
                        <span className={`text-xs font-bold tracking-wider ${asset.price_change_24h >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.3)]'}`}>
                            {fmtPct(asset.price_change_24h)}
                        </span>
                    ) : '-'}
                </td>
                <td className="px-4 py-5 text-right tabular-nums text-base font-medium text-white">
                    {asset.quantity.toLocaleString(isEnglish ? 'en-US' : 'pt-PT', { maximumFractionDigits: 6 })}
                </td>
                <td className="px-4 py-5 text-right tabular-nums text-lg font-black text-white drop-shadow-md">
                    {hasPrice ? formatCurrency(asset.value) : '-'}
                </td>
                <td className="px-4 py-5 text-right tabular-nums text-sm font-medium text-[var(--color-text-secondary)]">
                    {asset.avg_buy_price > 0 ? formatCurrency(asset.avg_buy_price) : '-'}
                </td>
                <td className="px-4 py-5 text-right">
                    {asset.avg_buy_price > 0 && hasPrice ? (
                        <div className={`flex flex-col items-end tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span className="font-black text-base drop-shadow-sm">{formatCurrency(totalPnl)}</span>
                            <span className="text-[10px] font-bold tracking-widest opacity-80">{fmtPct(asset.unrealized_pnl_percent)}</span>
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
                                            {txt('Historico de Transacoes', 'Transaction History')} -- {asset.symbol}
                                        </h4>
                                        {asset.realized_pnl !== 0 && (
                                            <span className={`text-xs font-medium ${asset.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {txt('PnL Realizado', 'Realized PnL')}: {formatCurrency(asset.realized_pnl)}
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
    const { txt, isEnglish } = useLocaleText()
    const typeLabelById: Record<string, string> = {
        buy: txt('Compra', 'Buy'),
        sell: txt('Venda', 'Sell'),
        swap: txt('Swap', 'Swap'),
        airdrop: txt('Airdrop', 'Airdrop'),
        transfer_in: txt('Transferencia', 'Transfer'),
    }
    const typeLabel = typeLabelById[tx.type] ?? tx.type
    const typeColor = TX_TYPE_COLORS[tx.type] ?? 'text-[var(--color-text-muted)]'

    return (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/20 transition-colors group text-xs">
            <span title={tx.source === 'hash_verified' ? txt('Hash Verificado', 'Hash Verified') : txt('Manual', 'Manual')}>
                {tx.source === 'hash_verified'
                    ? <Hash size={12} className="text-emerald-400" />
                    : <PenLine size={12} className="text-[var(--color-text-muted)]" />
                }
            </span>
            <span className={`font-bold w-16 ${typeColor}`}>{typeLabel}</span>
            <span className="text-[var(--color-text-muted)] w-20">{fmtDate(tx.executed_at, isEnglish ? 'en-US' : 'pt-PT')}</span>
            <span className="tabular-nums font-medium flex-1 text-[var(--color-text-primary)]">
                {tx.quantity.toLocaleString(isEnglish ? 'en-US' : 'pt-PT', { maximumFractionDigits: 6 })} {tx.symbol}
                {tx.price_per_unit ? (
                    <span className="text-[var(--color-text-muted)] ml-2">@ {formatCurrency(tx.price_per_unit)}</span>
                ) : null}
            </span>
            {tx.exchange && <span className="text-[var(--color-text-muted)]">{tx.exchange}</span>}
            {tx.fee && tx.fee > 0 && (
                <span className="text-[var(--color-text-muted)]">{txt('taxa', 'fee')}: {formatCurrency(tx.fee)}</span>
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
