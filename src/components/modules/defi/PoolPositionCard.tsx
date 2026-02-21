import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Trash2, AlertTriangle } from 'lucide-react'
import type { DefiPosition } from '@/types'
import { fetchPairPrice } from '@/services/defiLedgerService'
import { calcPoolPnL } from '@/services/defiMathService'
import { useState } from 'react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

interface Props {
    position: DefiPosition
    onClose: (id: string, closeValueUsd: number) => void
    onDelete: (id: string) => void
    index: number
}

export function PoolPositionCard({ position, onClose, onDelete, index }: Props) {
    const { txt, isEnglish } = useLocaleText()
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative p-5 rounded-2xl bg-transparent border border-transparent hover:bg-white/[0.03] hover:border-white/10 hover:shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ${isClosed ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                    <span className="text-xl font-black tracking-tight text-white drop-shadow-md">
                        {position.base_symbol}/{position.quote_symbol}
                    </span>
                    <div className="flex gap-2 items-center">
                        {position.dex_id && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_10px_rgba(255,90,0,0.1)]">
                                {position.dex_id}
                            </span>
                        )}
                        {position.chain_id && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-[var(--color-text-muted)]">
                                {position.chain_id}
                            </span>
                        )}
                        {isClosed && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                {txt('Fechada', 'Closed')}
                            </span>
                        )}
                    </div>
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
                <div className="mb-6">
                    <div className="flex justify-between text-[11px] font-bold tracking-wider uppercase text-[var(--color-text-muted)] mb-2">
                        <span>{txt('Min', 'Min')}: {position.tick_lower}</span>
                        <span className={`${pnlData.inRange ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]'}`}>
                            {pnlData.inRange ? txt('In Range', 'In Range') : txt('Out of Range', 'Out of Range')}
                        </span>
                        <span>{txt('Max', 'Max')}: {position.tick_upper}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
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
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm mb-1">{txt('Entrada', 'Entry')}</p>
                    <p className="text-lg font-black tracking-tight text-white drop-shadow-md tabular-nums">
                        ${(position.initial_value_usd ?? 0).toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm mb-1">
                        {isClosed ? txt('Fecho', 'Close') : txt('Atual', 'Current')}
                    </p>
                    <p className="text-lg font-black tracking-tight text-white drop-shadow-md tabular-nums">
                        ${(isClosed ? position.close_value_usd ?? 0 : pnlData.currentValue).toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm mb-1">PnL</p>
                    <p className={`text-lg font-black tracking-tight flex items-center tabular-nums drop-shadow-md ${pnlData.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnlData.pnlPercent >= 0 ? '+' : ''}{pnlData.pnlPercent.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* IL indicator */}
            {pnlData.il < -0.001 && !isClosed && (
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] mt-2">
                    ⚠ IL: {(pnlData.il * 100).toFixed(2)}%
                </p>
            )}

            {/* Actions */}
            {!isClosed && (
                <div className="flex gap-4 mt-6 pt-4 border-t border-white/10 items-center justify-between">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">
                        {new Date(position.entry_date).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT')}
                    </p>
                    <div className="flex items-center gap-2">
                        <Magnetic strength={0.2}>
                            <button onClick={() => onClose(position.id, pnlData.currentValue)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all">
                                {txt('Fechar', 'Close')}
                            </button>
                        </Magnetic>
                        <Magnetic strength={0.3}>
                            <button onClick={() => setShowDeleteAlert(true)}
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer">
                                <Trash2 size={14} />
                            </button>
                        </Magnetic>
                    </div>
                </div>
            )}

            {/* Closed = show delete only */}
            {isClosed && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">
                        {new Date(position.entry_date).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT')}
                    </p>
                    <Magnetic strength={0.2}>
                        <button onClick={() => setShowDeleteAlert(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer">
                            <Trash2 size={12} strokeWidth={2.5} /> {txt('Esquecer', 'Forget')}
                        </button>
                    </Magnetic>
                </div>
            )}

            {/* Delete confirmation alert */}
            <AnimatePresence>
                {showDeleteAlert && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 border border-rose-500/30"
                    >
                        <AlertTriangle size={32} strokeWidth={1.5} className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)] mb-3" />
                        <p className="text-lg font-black tracking-tight text-white mb-2">{txt('Eliminar posicao?', 'Delete position?')}</p>
                        <p className="text-[11px] font-bold text-rose-400/80 text-center mb-6 px-4 uppercase tracking-[0.1em] leading-relaxed">
                            {txt('Esta acao e irreversivel e afetara estatisticas passadas.', 'This action is irreversible and affects past stats.')}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowDeleteAlert(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer">{txt('Cancelar', 'Cancel')}</button>
                            <button onClick={() => onDelete(position.id)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer">{txt('Eliminar', 'Delete')}</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
