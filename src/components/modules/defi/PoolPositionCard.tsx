import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, TrendingUp, TrendingDown, Trash2, XCircle, AlertTriangle } from 'lucide-react'
import type { DefiPosition } from '@/types'
import { fetchPairPrice } from '@/services/defiLedgerService'
import { calcPoolPnL } from '@/services/defiMathService'
import { useState } from 'react'

interface Props {
    position: DefiPosition
    onClose: (id: string, closeValueUsd: number) => void
    onDelete: (id: string) => void
    index: number
}

export function PoolPositionCard({ position, onClose, onDelete, index }: Props) {
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const isClosed = position.status === 'closed'

    const livePrice = useQuery({
        queryKey: ['pair-price', position.chain_id, position.pair_address],
        queryFn: () => fetchPairPrice(position.chain_id!, position.pair_address!),
        enabled: !!position.chain_id && !!position.pair_address && !isClosed,
        refetchInterval: 30_000,
        staleTime: 15_000,
    })

    const currentBasePrice = livePrice.data?.priceUsd ?? position.entry_price ?? 0
    const pnlData = calcPoolPnL(position, currentBasePrice)

    const isPositive = pnlData.pnl >= 0
    const pnlColor = isPositive ? 'text-green-400' : 'text-red-400'

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
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {position.base_symbol}/{position.quote_symbol}
                    </span>
                    {position.dex_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                            {position.dex_id}
                        </span>
                    )}
                    {position.chain_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                            {position.chain_id}
                        </span>
                    )}
                    {isClosed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
                            Fechada
                        </span>
                    )}
                </div>
                {position.pool_url && (
                    <a href={position.pool_url} target="_blank" rel="noopener noreferrer"
                        className="text-[var(--color-accent)] hover:underline">
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>

            {/* Tick range bar */}
            {position.tick_lower != null && position.tick_upper != null && (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                        <span>Min: {position.tick_lower}</span>
                        <span className={`font-bold ${pnlData.inRange ? 'text-green-400' : 'text-red-400'}`}>
                            {pnlData.inRange ? 'In Range' : 'Out of Range'}
                        </span>
                        <span>Max: {position.tick_upper}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <div
                            className={`absolute h-full rounded-full ${pnlData.inRange ? 'bg-green-400' : 'bg-red-400'}`}
                            style={{
                                left: '0%',
                                width: `${Math.min(100, Math.max(5,
                                    ((currentBasePrice - position.tick_lower!) / (position.tick_upper! - position.tick_lower!)) * 100
                                ))}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Values grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Entrada</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                        ${(position.initial_value_usd ?? 0).toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase">
                        {isClosed ? 'Fecho' : 'Atual'}
                    </p>
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

            {/* IL indicator */}
            {pnlData.il < -0.001 && !isClosed && (
                <p className="text-[10px] text-amber-400/70 mt-2 text-center">
                    ⚠ IL: {(pnlData.il * 100).toFixed(2)}%
                </p>
            )}

            {/* Actions */}
            {!isClosed && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => onClose(position.id, pnlData.currentValue)}
                        className="flex-1 btn btn-ghost text-xs py-1.5">
                        <XCircle size={12} /> Fechar posição
                    </button>
                    <button onClick={() => setShowDeleteAlert(true)}
                        className="btn btn-ghost text-xs py-1.5 text-red-400 hover:text-red-300">
                        <Trash2 size={12} />
                    </button>
                </div>
            )}

            {/* Closed = show delete only */}
            {isClosed && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => setShowDeleteAlert(true)}
                        className="btn btn-ghost text-xs py-1.5 text-red-400 hover:text-red-300 w-full">
                        <Trash2 size={12} /> Eliminar do histórico
                    </button>
                </div>
            )}

            {/* Delete confirmation alert */}
            {showDeleteAlert && (
                <div className="absolute inset-0 bg-[var(--surface-critical)] rounded-[var(--card-radius)] flex flex-col items-center justify-center p-4 z-10">
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

            {/* Entry date */}
            <p className="text-[10px] text-[var(--color-text-muted)] mt-2 text-right">
                {new Date(position.entry_date).toLocaleDateString('pt-PT')}
            </p>
        </motion.div>
    )
}
