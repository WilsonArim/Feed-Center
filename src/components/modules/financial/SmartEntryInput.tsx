import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import { parseNaturalInput, suggestCategory } from '@/services/aiFinancialService'
import { CATEGORIES_BY_TYPE, type EntryType } from '@/types'

interface Props {
    onSubmit: (data: { description: string; amount: number; category: string; type: EntryType }) => void
    isLoading?: boolean
}

export function SmartEntryInput({ onSubmit, isLoading }: Props) {
    const [value, setValue] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedType, setSelectedType] = useState<EntryType>('expense')
    const inputRef = useRef<HTMLInputElement>(null)

    const parsed = useMemo(() => {
        if (!value.trim()) return null
        const result = parseNaturalInput(value)
        const suggestion = result.description ? suggestCategory(result.description, selectedType) : null
        return { ...result, suggestion }
    }, [value, selectedType])

    const handleSubmit = useCallback(() => {
        if (!parsed?.amount || !parsed.description) return

        const categories = CATEGORIES_BY_TYPE[selectedType]
        const category = parsed.suggestion?.category ?? categories[0] ?? 'Outros'

        onSubmit({
            description: parsed.description,
            amount: parsed.amount,
            category,
            type: selectedType,
        })

        setValue('')
        setIsExpanded(false)
    }, [parsed, selectedType, onSubmit])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
        if (e.key === 'Escape') {
            setValue('')
            setIsExpanded(false)
        }
    }, [handleSubmit])

    // ⌘K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsExpanded(true)
                setTimeout(() => inputRef.current?.focus(), 100)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const typeButtons: { value: EntryType; label: string; emoji: string }[] = [
        { value: 'expense', label: 'Despesa Pontual', emoji: '💸' },
        { value: 'income', label: 'Receita', emoji: '💰' },
        { value: 'bill', label: 'Despesa Fixa', emoji: '📄' },
    ]

    return (
        <div className="relative">
            {/* Compact trigger */}
            {!isExpanded && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setIsExpanded(true)
                        setTimeout(() => inputRef.current?.focus(), 100)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] cursor-pointer group"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <Sparkles size={16} className="text-[var(--color-accent)] opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Regista rápido... <kbd className="ml-2 px-1.5 py-0.5 rounded text-xs bg-white/5 border border-white/10">⌘K</kbd>
                    </span>
                </motion.button>
            )}

            {/* Expanded input */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="modal-panel rounded-[var(--radius-lg)] overflow-hidden"
                        style={{ border: '1px solid var(--color-accent)', boxShadow: '0 0 20px rgba(59,130,246,0.15)' }}
                    >
                        {/* Type quick-select */}
                        <div className="flex gap-1 p-2 pb-0">
                            {typeButtons.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setSelectedType(t.value)}
                                    className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-all cursor-pointer ${selectedType === t.value
                                        ? 'bg-[var(--color-accent)] text-white'
                                        : 'hover:bg-white/5'
                                        }`}
                                    style={selectedType !== t.value ? { color: 'var(--color-text-muted)' } : {}}
                                >
                                    {t.emoji} {t.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <button
                                onClick={() => { setValue(''); setIsExpanded(false) }}
                                className="p-1 rounded-[var(--radius-sm)] hover:bg-white/5 cursor-pointer"
                            >
                                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>

                        {/* Input */}
                        <div className="flex items-center gap-2 p-3">
                            <Sparkles size={16} className="text-[var(--color-accent)] flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    selectedType === 'expense' ? 'Ex: Continente 45.50€'
                                        : selectedType === 'income' ? 'Ex: Freelance projeto 500€'
                                            : 'Ex: EDP eletricidade 65€'
                                }
                                className="flex-1 bg-transparent text-sm outline-none"
                                style={{ color: 'var(--color-text-primary)' }}
                                autoFocus
                            />
                            {parsed?.amount && (
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="p-2 rounded-full bg-[var(--color-accent)] text-white cursor-pointer disabled:opacity-50"
                                >
                                    <ArrowRight size={14} />
                                </motion.button>
                            )}
                        </div>

                        {/* Live preview */}
                        <AnimatePresence>
                            {parsed?.amount && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-3 pb-3 flex items-center gap-2 text-xs"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    <span className="px-2 py-0.5 rounded-full bg-white/5">
                                        {parsed.amount.toFixed(2)}€
                                    </span>
                                    <span>→</span>
                                    <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                        {parsed.description}
                                    </span>
                                    {parsed.suggestion && (
                                        <>
                                            <span>→</span>
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    background: parsed.suggestion.confidence > 0.8 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                                    color: parsed.suggestion.confidence > 0.8 ? '#22c55e' : '#eab308',
                                                }}
                                            >
                                                {parsed.suggestion.category}
                                                {parsed.suggestion.confidence > 0.8 ? ' ✓' : ' ?'}
                                            </span>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
