import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Calendar, Coins } from 'lucide-react'
import { VisionUploadButton } from './VisionUploadButton'
import type { CreateStakeInput, VisionOcrResult } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreateStakeInput) => void
    isLoading: boolean
}

export function AddStakeModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
    const { txt } = useLocaleText()
    const [tokenSymbol, setTokenSymbol] = useState('')
    const [tokenAmount, setTokenAmount] = useState('')
    const [priceAtEntry, setPriceAtEntry] = useState('')
    const [apy, setApy] = useState('')
    const [chainId, setChainId] = useState('')
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 16))
    const [notes, setNotes] = useState('')

    const handleVision = (result: VisionOcrResult) => {
        const f = result.fields
        if (f.token) setTokenSymbol(f.token)
        if (f.amount) setTokenAmount(f.amount)
        if (f.price) setPriceAtEntry(f.price)
        if (f.apy) setApy(f.apy)
        if (f.date) setEntryDate(f.date)
    }

    const isValid = tokenSymbol.trim() && parseFloat(tokenAmount) > 0 && parseFloat(priceAtEntry) > 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValid) return
        onSubmit({
            token_symbol: tokenSymbol.toUpperCase(),
            token_amount: parseFloat(tokenAmount),
            token_price_at_entry: parseFloat(priceAtEntry),
            apy_at_entry: apy ? parseFloat(apy) : undefined,
            chain_id: chainId || undefined,
            entry_date: new Date(entryDate).toISOString(),
            notes: notes || undefined,
        })
        setTokenSymbol(''); setTokenAmount(''); setPriceAtEntry(''); setApy(''); setNotes('')
    }

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const initialValue = (parseFloat(tokenAmount) || 0) * (parseFloat(priceAtEntry) || 0)

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'var(--modal-overlay)' }}
                    onClick={onClose}
                >
                    <motion.form
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        onSubmit={handleSubmit}
                        className="modal-panel w-full max-w-md"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-stake-modal-title"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 id="add-stake-modal-title" className="text-h3 flex items-center gap-2"><Coins size={18} /> {txt('Adicionar Stake', 'Add Stake')}</h2>
                            <button type="button" onClick={onClose} className="btn-ghost w-8 h-8 rounded-full flex items-center justify-center" aria-label={txt('Fechar modal', 'Close modal')}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Token</label>
                                    <input type="text" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)}
                                        placeholder="SOL" className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{txt('Quantidade', 'Quantity')}</label>
                                    <input type="number" step="any" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)}
                                        placeholder="100" className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{txt('Preco a entrada ($)', 'Entry Price ($)')}</label>
                                    <input type="number" step="any" value={priceAtEntry} onChange={e => setPriceAtEntry(e.target.value)}
                                        placeholder="150.00" className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{txt('APY % (opcional)', 'APY % (optional)')}</label>
                                    <input type="number" step="any" value={apy} onChange={e => setApy(e.target.value)}
                                        placeholder="8.5" className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)' }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1"><Calendar size={10} /> {txt('Data', 'Date')}</label>
                                    <input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)', colorScheme: 'dark' }} />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{txt('Chain (opcional)', 'Chain (optional)')}</label>
                                    <select value={chainId} onChange={e => setChainId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)]"
                                        style={{ color: 'var(--color-text-primary)', colorScheme: 'dark' }}>
                                        <option value="">—</option>
                                        <option value="solana">Solana</option>
                                        <option value="ethereum">Ethereum</option>
                                        <option value="bsc">BSC</option>
                                        <option value="polygon">Polygon</option>
                                        <option value="arbitrum">Arbitrum</option>
                                    </select>
                                </div>
                            </div>

                            {initialValue > 0 && (
                                <p className="text-xs text-[var(--color-accent)] px-3 py-1.5 rounded-lg bg-[var(--color-accent-soft)]">
                                    {txt('Valor a entrada', 'Entry value')}: <strong>${initialValue.toFixed(2)}</strong>
                                </p>
                            )}

                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={txt('Notas (opcional)', 'Notes (optional)')}
                                className="w-full px-3 py-2.5 rounded-[var(--btn-radius)] bg-[var(--surface-interactive)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent)] resize-none"
                                style={{ color: 'var(--color-text-primary)' }} />
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-border)]">
                            <VisionUploadButton onResult={handleVision} label={txt('Importar print', 'Import screenshot')} />
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="btn btn-ghost">{txt('Cancelar', 'Cancel')}</button>
                                <button type="submit" disabled={!isValid || isLoading} className="btn btn-primary">
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : txt('Guardar', 'Save')}
                                </button>
                            </div>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
