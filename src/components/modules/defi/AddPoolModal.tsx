import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link, Loader2, Search, Calendar, Info, DollarSign } from 'lucide-react'
import { resolvePoolFromUrl, fetchHistoricalPrice } from '@/services/defiLedgerService'
import { calcInitialPoolValue } from '@/services/defiMathService'
import { VisionUploadButton } from './VisionUploadButton'
import type { CreatePoolInput, DexScreenerPairResolved, VisionOcrResult } from '@/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreatePoolInput) => void
    isLoading: boolean
}

export function AddPoolModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
    const [poolUrl, setPoolUrl] = useState('')
    const [resolving, setResolving] = useState(false)
    const [pair, setPair] = useState<DexScreenerPairResolved | null>(null)
    const [resolveError, setResolveError] = useState('')

    const [tickLower, setTickLower] = useState('')
    const [tickUpper, setTickUpper] = useState('')
    const [baseAmount, setBaseAmount] = useState('')
    const [quoteAmount, setQuoteAmount] = useState('')
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 16))
    const [notes, setNotes] = useState('')

    // Historical price state
    const [histBasePrice, setHistBasePrice] = useState<number | null>(null)
    const [histQuotePrice, setHistQuotePrice] = useState<number | null>(null)
    const [fetchingPrice, setFetchingPrice] = useState(false)

    const handleResolve = async () => {
        if (!poolUrl.trim()) return
        setResolving(true)
        setResolveError('')
        setPair(null)
        setHistBasePrice(null)
        setHistQuotePrice(null)

        const result = await resolvePoolFromUrl(poolUrl.trim())
        if (result) {
            setPair(result)
        } else {
            setResolveError('Não foi possível resolver o par. Verifica o URL do DexScreener.')
        }
        setResolving(false)
    }

    // Fetch historical prices when pair + date are set
    const fetchPrices = useCallback(async () => {
        if (!pair || !entryDate) return
        setFetchingPrice(true)

        const [baseP, quoteP] = await Promise.all([
            fetchHistoricalPrice(pair.baseSymbol, entryDate),
            fetchHistoricalPrice(pair.quoteSymbol, entryDate),
        ])

        setHistBasePrice(baseP)
        // For stablecoins, default to $1
        const stables = ['USDC', 'USDT', 'DAI', 'BUSD', 'UST', 'TUSD']
        setHistQuotePrice(stables.includes(pair.quoteSymbol.toUpperCase()) ? 1 : quoteP)
        setFetchingPrice(false)
    }, [pair, entryDate])

    // Auto-fetch when date changes and pair is resolved
    useEffect(() => {
        if (pair && entryDate) {
            const timer = setTimeout(fetchPrices, 500) // debounce
            return () => clearTimeout(timer)
        }
    }, [pair, entryDate, fetchPrices])

    const handleVisionResult = (result: VisionOcrResult) => {
        const f = result.fields
        if (f.tickLower) setTickLower(f.tickLower)
        if (f.tickUpper) setTickUpper(f.tickUpper)
        if (f.amount) setBaseAmount(f.amount)
        if (f.date) setEntryDate(f.date)
    }

    const baseAmt = parseFloat(baseAmount) || 0
    const quoteAmt = parseFloat(quoteAmount) || 0
    const basePriceAtEntry = histBasePrice ?? pair?.priceUsd ?? 0
    const quotePriceAtEntry = histQuotePrice ?? 1
    const initialValue = calcInitialPoolValue(baseAmt, basePriceAtEntry, quoteAmt, quotePriceAtEntry)

    const isValid = pair && (baseAmt > 0 || quoteAmt > 0) && tickLower && tickUpper && entryDate

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!pair || !isValid) return

        onSubmit({
            pool_url: poolUrl,
            pair_address: pair.pairAddress,
            chain_id: pair.chainId,
            dex_id: pair.dexId,
            base_symbol: pair.baseSymbol,
            quote_symbol: pair.quoteSymbol,
            base_address: pair.baseAddress,
            quote_address: pair.quoteAddress,
            tick_lower: parseFloat(tickLower),
            tick_upper: parseFloat(tickUpper),
            base_amount: baseAmt,
            quote_amount: quoteAmt,
            entry_price: basePriceAtEntry,
            initial_value_usd: initialValue,
            entry_date: new Date(entryDate).toISOString(),
            notes: notes || undefined,
        })

        setPoolUrl(''); setPair(null); setTickLower(''); setTickUpper('')
        setBaseAmount(''); setQuoteAmount(''); setNotes('')
        setHistBasePrice(null); setHistQuotePrice(null)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'var(--modal-overlay)' }}
                >
                    <motion.form
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.25 }}
                        onSubmit={handleSubmit}
                        className="modal-panel w-full max-w-lg max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-h3">Adicionar Pool</h2>
                            <button type="button" onClick={onClose} className="btn-ghost w-8 h-8 rounded-full flex items-center justify-center">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Step 1: Pool URL */}
                        <div className="mb-4">
                            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block uppercase tracking-wider">
                                Link DexScreener
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                    <input
                                        type="text"
                                        value={poolUrl}
                                        onChange={e => setPoolUrl(e.target.value)}
                                        placeholder="https://dexscreener.com/solana/..."
                                        className="w-full pl-9 pr-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResolve}
                                    disabled={resolving || !poolUrl.trim()}
                                    className="btn btn-primary px-4"
                                >
                                    {resolving ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                </button>
                            </div>
                            {resolveError && <p className="text-xs text-red-400 mt-1">{resolveError}</p>}
                        </div>

                        {/* Resolved pair info */}
                        {pair && (
                            <div className="card-info p-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-[var(--color-text-primary)]">
                                            {pair.baseSymbol}/{pair.quoteSymbol}
                                        </span>
                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                            {pair.dexId}
                                        </span>
                                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 opacity-50">
                                            {pair.chainId}
                                        </span>
                                    </div>
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                        Atual: ${pair.priceUsd.toFixed(pair.priceUsd < 1 ? 6 : 2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Position details */}
                        {pair && (
                            <>
                                {/* Date FIRST — drives the historical price lookup */}
                                <div className="mb-4">
                                    <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 flex items-center gap-1.5">
                                        <Calendar size={12} /> Data de entrada
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={entryDate}
                                        onChange={e => setEntryDate(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                        style={{ color: 'var(--color-text-primary)', colorScheme: 'dark' }}
                                    />
                                </div>

                                {/* Historical price indicator */}
                                <div className="mb-4 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <DollarSign size={12} />
                                            Preço {pair.baseSymbol} à data
                                        </span>
                                        {fetchingPrice ? (
                                            <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                                                <Loader2 size={10} className="animate-spin" /> A buscar...
                                            </span>
                                        ) : histBasePrice ? (
                                            <span className="font-mono font-bold text-[var(--color-text-primary)]">
                                                ${histBasePrice.toFixed(histBasePrice < 1 ? 6 : 2)}
                                            </span>
                                        ) : (
                                            <span className="text-amber-400 text-[10px]">
                                                Preço histórico indisponível — usa preço atual
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Tick range */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Tick Min</label>
                                        <input
                                            type="number" step="any" value={tickLower}
                                            onChange={e => setTickLower(e.target.value)}
                                            placeholder="0.00123"
                                            className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Tick Max</label>
                                        <input
                                            type="number" step="any" value={tickUpper}
                                            onChange={e => setTickUpper(e.target.value)}
                                            placeholder="0.00456"
                                            className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                </div>

                                {/* Token amounts */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">
                                            {pair.baseSymbol} depositado
                                        </label>
                                        <input
                                            type="number" step="any" value={baseAmount}
                                            onChange={e => setBaseAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">
                                            {pair.quoteSymbol} depositado
                                        </label>
                                        <input
                                            type="number" step="any" value={quoteAmount}
                                            onChange={e => setQuoteAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                </div>

                                {/* Auto-calculated initial value — READ ONLY */}
                                {(baseAmt > 0 || quoteAmt > 0) && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-lg bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
                                        <Info size={14} className="text-[var(--color-accent)] flex-shrink-0" />
                                        <div className="flex-1">
                                            <span className="text-xs text-[var(--color-accent)]">Valor inicial calculado</span>
                                            <p className="text-lg font-mono font-bold text-[var(--color-text-primary)]">
                                                ${initialValue.toFixed(2)}
                                            </p>
                                        </div>
                                        {fetchingPrice && <Loader2 size={12} className="animate-spin text-[var(--color-accent)]" />}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">Notas (opcional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    />
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                            <VisionUploadButton onResult={handleVisionResult} label="Importar print" />
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={!isValid || isLoading || fetchingPrice}
                                    className="btn btn-primary"
                                >
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
