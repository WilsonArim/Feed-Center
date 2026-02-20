import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Trash2, XCircle, AlertTriangle, Coins, ArrowDownUp } from 'lucide-react'
import type { DefiPosition } from '@/types'
import { fetchTokenPrice } from '@/services/defiLedgerService'
import { calcTokenPnL } from '@/services/defiMathService'
import { useState } from 'react'

interface Props {
    position: DefiPosition
    onClose: (id: string, closeValueUsd: number) => void
    onDelete: (id: string) => void
    index: number
}

export function TokenPositionCard({ position, onClose, onDelete, index }: Props) {
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const isClosed = position.status === 'closed'
    const isStake = position.type === 'stake'

    const livePrice = useQuery({
        queryKey: ['token-price', position.token_symbol],
        queryFn: () => fetchTokenPrice(position.token_symbol!),
        enabled: !!position.token_symbol && !isClosed,
        refetchInterval: 60_000,
        staleTime: 30_000,
    })

    const currentPrice = livePrice.data ?? position.token_price_at_entry ?? 0
    const pnlData = calcTokenPnL(
        position.token_amount ?? 0,
        position.token_price_at_entry ?? 0,
        currentPrice,
    )

    const isPositive = pnlData.pnl >= 0
    const pnlColor = isPositive ? 'text-green-400' : 'text-red-400'
    const Icon = isStake ? Coins : ArrowDownUp

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card-info p-4 relative ${isClosed ? 'opacity-60' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon size={14} className="text-[var(--color-accent)]" />
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {position.token_symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                        {position.type === 'stake' ? 'Stake' : position.type === 'borrow' ? 'Borrow' : 'Lend'}
                    </span>
                    {position.chain_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                            {position.chain_id}
                        </span>
                    )}
                    {isClosed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">Fechada</span>
                    )}
                </div>
                {position.apy_at_entry != null && (
                    <span className="text-xs text-green-400 font-mono">{position.apy_at_entry}% APY</span>
                )}
            </div>

            {/* Amount + Price */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Quantidade</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                        {(position.token_amount ?? 0).toLocaleString('en', { maximumFractionDigits: 4 })}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Valor</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                        ${(isClosed ? position.close_value_usd ?? 0 : pnlData.currentValue).toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">PnL</p>
                    <p className={`text-sm font-mono font-bold flex items-center justify-center gap-0.5 ${pnlColor}`}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {isPositive ? '+' : ''}{pnlData.pnlPercent.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Actions */}
            {!isClosed && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => onClose(position.id, pnlData.currentValue)}
                        className="flex-1 btn btn-ghost text-xs py-1.5">
                        <XCircle size={12} /> Fechar
                    </button>
                    <button onClick={() => setShowDeleteAlert(true)}
                        className="btn btn-ghost text-xs py-1.5 text-red-400">
                        <Trash2 size={12} />
                    </button>
                </div>
            )}

            {isClosed && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => setShowDeleteAlert(true)}
                        className="btn btn-ghost text-xs py-1.5 text-red-400 w-full">
                        <Trash2 size={12} /> Eliminar
                    </button>
                </div>
            )}

            {/* Delete alert */}
            {showDeleteAlert && (
                <div className="absolute inset-0 bg-[var(--danger-soft)] rounded-2xl flex flex-col items-center justify-center p-4 z-10">
                    <AlertTriangle size={24} className="text-red-400 mb-2" />
                    <p className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Eliminar posição?</p>
                    <p className="text-[11px] text-red-400/80 text-center mb-4">
                        Esta ação é irreversível e vai danificar o cálculo de PnL global.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setShowDeleteAlert(false)} className="btn btn-ghost text-xs">Cancelar</button>
                        <button onClick={() => onDelete(position.id)} className="btn btn-danger text-xs">Eliminar</button>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-[var(--color-text-muted)] mt-2 text-right">
                {new Date(position.entry_date).toLocaleDateString('pt-PT')}
            </p>
        </motion.div>
    )
}
