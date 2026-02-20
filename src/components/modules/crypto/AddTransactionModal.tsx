import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, Hash, PenLine, Coins, ArrowDownUp, Repeat2, Gift, ArrowDownToLine, Sparkles } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { coinGeckoService, type CoinGeckoToken } from '@/services/coinGeckoService'
import type { CreateTransactionInput, CryptoWallet, TransactionType, TransactionSource } from '@/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreateTransactionInput) => void
    isLoading: boolean
    wallets: CryptoWallet[]
}

const txTypes: { value: TransactionType; label: string; icon: React.ReactNode }[] = [
    { value: 'buy', label: 'Compra', icon: <Coins size={13} /> },
    { value: 'sell', label: 'Venda', icon: <ArrowDownUp size={13} /> },
    { value: 'swap', label: 'Swap', icon: <Repeat2 size={13} /> },
    { value: 'airdrop', label: 'Airdrop', icon: <Gift size={13} /> },
    { value: 'transfer_in', label: 'Transfer', icon: <ArrowDownToLine size={13} /> },
]

const exchanges = ['Binance', 'Kraken', 'Coinbase', 'Phantom', 'MetaMask', 'Raydium', 'Jupiter', 'Uniswap', 'Outro']
const pairs = ['EUR', 'USD', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL']

export function AddTransactionModal({ isOpen, onClose, onSubmit, isLoading, wallets }: Props) {
    // Dual-path tab
    const [tab, setTab] = useState<'manual' | 'hash'>('manual')

    // Common fields
    const [txType, setTxType] = useState<TransactionType>('buy')
    const [walletId, setWalletId] = useState('')

    // Token search
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<CoinGeckoToken[]>([])
    const [selected, setSelected] = useState<CoinGeckoToken | null>(null)
    const [searching, setSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    // Transaction fields
    const [quantity, setQuantity] = useState('')
    const [pricePerUnit, setPricePerUnit] = useState('')
    const [fee, setFee] = useState('')
    const [feeToken, setFeeToken] = useState('')
    const [pair, setPair] = useState('EUR')
    const [exchange, setExchange] = useState('')
    const [executedAt, setExecutedAt] = useState(new Date().toISOString().slice(0, 10))
    const [notes, setNotes] = useState('')

    // Hash tab + Copilot
    const [txHash, setTxHash] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<{ summary: string; confidence: string } | null>(null)

    const handleAnalyzeHash = async () => {
        if (!txHash.trim()) return
        setAnalyzing(true)
        setAnalysisResult(null)

        // Inline hash format analysis (v1)
        const hash = txHash.trim()
        let chain = 'desconhecida'
        if (hash.startsWith('0x') && hash.length === 66) chain = 'ethereum'
        else if (hash.length >= 80 && hash.length <= 100) chain = 'solana'

        setAnalysisResult({
            summary: `Hash detectado como ${chain}. Preenche os campos abaixo manualmente. Auto-parse via Solscan/Etherscan em breve.`,
            confidence: chain !== 'desconhecida' ? 'medium' : 'low',
        })
        setAnalyzing(false)
    }

    useEffect(() => {
        if (wallets.length > 0 && !walletId) setWalletId(wallets[0]!.id)
    }, [wallets, walletId])

    useEffect(() => {
        if (isOpen) coinGeckoService.loadTopTokens()
    }, [isOpen])

    // Debounced search
    useEffect(() => {
        if (!query.trim()) { setResults([]); setShowDropdown(false); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            const tokens = await coinGeckoService.searchTokens(query)
            setResults(tokens)
            setShowDropdown(tokens.length > 0)
            setSearching(false)
        }, 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query])

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const handleSelect = (token: CoinGeckoToken) => {
        setSelected(token)
        setQuery(token.name)
        setShowDropdown(false)
    }

    const source: TransactionSource = tab === 'hash' && txHash.trim() ? 'hash_verified' : 'manual'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selected || !walletId || !quantity) return

        onSubmit({
            wallet_id: walletId,
            type: txType,
            coingecko_id: selected.id,
            symbol: selected.symbol,
            name: selected.name,
            image: selected.image,
            quantity: parseFloat(quantity),
            price_per_unit: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
            fee: fee ? parseFloat(fee) : undefined,
            fee_token: feeToken || undefined,
            pair: pair || 'EUR',
            exchange: exchange || undefined,
            tx_hash: txHash.trim() || undefined,
            source,
            notes: notes || undefined,
            executed_at: new Date(executedAt).toISOString(),
        })

        // Reset all
        setQuery(''); setSelected(null); setQuantity(''); setPricePerUnit('')
        setFee(''); setFeeToken(''); setNotes(''); setTxHash('')
        setExecutedAt(new Date().toISOString().slice(0, 10))
    }

    const isValid = !!selected && !!walletId && parseFloat(quantity) > 0

    const inputCls = "w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)] transition-colors"
    const labelCls = "text-xs font-medium mb-1 block"

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={e => e.stopPropagation()}
                        className="modal-panel w-full max-w-lg rounded-[var(--radius-xl)] p-6 relative overflow-visible max-h-[90vh] overflow-y-auto custom-scrollbar"
                        style={{ border: '1px solid var(--color-border)' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-transaction-modal-title"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 id="add-transaction-modal-title" className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                📝 Nova Transação
                            </h2>
                            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors cursor-pointer" aria-label="Fechar modal">
                                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>

                        {/* Dual-path tabs */}
                        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] mb-5">
                            <button
                                type="button"
                                onClick={() => setTab('manual')}
                                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all cursor-pointer ${tab === 'manual'
                                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                <PenLine size={14} /> ✍️ Manual
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('hash')}
                                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all cursor-pointer ${tab === 'hash'
                                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                <Hash size={14} /> 🔗 Colar Hash
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Hash tab: hash input + copilot */}
                            {tab === 'hash' && (
                                <div className="p-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 space-y-3">
                                    <label className={labelCls} style={{ color: 'var(--color-accent)' }}>
                                        🔗 Transaction Hash
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={txHash}
                                            onChange={e => { setTxHash(e.target.value); setAnalysisResult(null) }}
                                            placeholder="Cole o hash da transação aqui..."
                                            className={`${inputCls} flex-1`}
                                            style={{ color: 'var(--color-text-primary)' }}
                                            autoFocus
                                        />
                                        <StardustButton
                                            type="button"
                                            size="sm"
                                            onClick={handleAnalyzeHash}
                                            disabled={!txHash.trim() || analyzing}
                                            icon={analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                        >
                                            {analyzing ? 'A analisar...' : 'Analisar'}
                                        </StardustButton>
                                    </div>

                                    {/* Analysis Result */}
                                    {analysisResult && (
                                        <div className="p-3 rounded-[var(--radius-md)] bg-white/5 border border-white/10">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Sparkles size={12} className="text-amber-400" />
                                                <span className="text-xs font-bold opacity-70">Copilot Buggy</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${analysisResult.confidence === 'high' ? 'bg-green-500/10 text-green-400'
                                                    : analysisResult.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {analysisResult.confidence}
                                                </span>
                                            </div>
                                            <p className="text-xs opacity-60 leading-relaxed">{analysisResult.summary}</p>
                                        </div>
                                    )}


                                </div>
                            )}

                            {/* Transaction Type */}
                            <div className="flex gap-1.5 flex-wrap">
                                {txTypes.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTxType(t.value)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${txType === t.value
                                            ? 'bg-[var(--color-accent)] text-white shadow-md'
                                            : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10'
                                            }`}
                                    >
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Wallet Selector (if multiple) */}
                            {wallets.length > 1 && (
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Carteira</label>
                                    <select value={walletId} onChange={e => setWalletId(e.target.value)}
                                        className={`${inputCls} cursor-pointer`} style={{ color: 'var(--color-text-primary)' }}>
                                        {wallets.map(w => (
                                            <option key={w.id} value={w.id}>{w.label || w.address.slice(0, 8) + '...'}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Token Search */}
                            <div className="relative">
                                <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Token *</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />}
                                    <input
                                        type="text" value={query}
                                        onChange={e => { setQuery(e.target.value); setSelected(null) }}
                                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                                        placeholder="Pesquisar token (ex: SOL, Ethereum...)"
                                        className={`${inputCls} pl-9`}
                                        style={{ color: 'var(--color-text-primary)' }}
                                        autoComplete="off"
                                    />
                                </div>
                                <AnimatePresence>
                                    {showDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                            className="absolute z-50 w-full mt-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                                            style={{ background: 'var(--color-bg-secondary)' }}
                                        >
                                            {results.map(token => (
                                                <button key={token.id} type="button" onClick={() => handleSelect(token)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer">
                                                    <img src={token.image} alt="" className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0"
                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{token.name}</div>
                                                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase">{token.symbol}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {selected && (
                                    <div className="flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 w-fit">
                                        <img src={selected.image} alt="" className="w-4 h-4 rounded-full" />
                                        <span className="text-xs font-medium text-[var(--color-accent)]">{selected.name} ({selected.symbol})</span>
                                    </div>
                                )}
                            </div>

                            {/* Row: Quantity + Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Quantidade *</label>
                                    <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}
                                        placeholder="0.00" className={inputCls} style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Preço Unitário (€)</label>
                                    <input type="number" step="any" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)}
                                        placeholder="148.50" className={inputCls} style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                            </div>

                            {/* Row: Date + Exchange */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Data *</label>
                                    <input type="date" value={executedAt} onChange={e => setExecutedAt(e.target.value)}
                                        className={`${inputCls} cursor-pointer`} style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Exchange</label>
                                    <select value={exchange} onChange={e => setExchange(e.target.value)}
                                        className={`${inputCls} cursor-pointer`} style={{ color: 'var(--color-text-primary)' }}>
                                        <option value="">Selecionar...</option>
                                        {exchanges.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Row: Pair + Fee */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Par</label>
                                    <select value={pair} onChange={e => setPair(e.target.value)}
                                        className={`${inputCls} cursor-pointer`} style={{ color: 'var(--color-text-primary)' }}>
                                        {pairs.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Fee (€)</label>
                                    <input type="number" step="any" value={fee} onChange={e => setFee(e.target.value)}
                                        placeholder="0.00" className={inputCls} style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Fee Token</label>
                                    <input type="text" value={feeToken} onChange={e => setFeeToken(e.target.value)}
                                        placeholder="SOL" className={inputCls} style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className={labelCls} style={{ color: 'var(--color-text-secondary)' }}>Notas</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: DCA semanal" className={inputCls} style={{ color: 'var(--color-text-primary)' }} />
                            </div>

                            {/* Source Badge Preview */}
                            <div className="flex items-center gap-2 pt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${source === 'hash_verified'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-white/5 text-white/40 border border-white/10'
                                    }`}>
                                    {source === 'hash_verified' ? '🔗 Hash Verified' : '✍️ Manual'}
                                </span>
                                <span className="text-[10px] opacity-30">
                                    Esta transação será marcada como {source === 'hash_verified' ? 'verificada por hash' : 'inserida manualmente'}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <StardustButton type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</StardustButton>
                                <StardustButton type="submit" size="sm" disabled={isLoading || !isValid}
                                    icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}>
                                    Registar
                                </StardustButton>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
