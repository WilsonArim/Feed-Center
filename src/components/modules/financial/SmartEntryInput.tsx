import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import { parseNaturalInput, suggestCategory } from '@/services/aiFinancialService'
import { CATEGORIES_BY_TYPE, type EntryType } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'

interface Props {
    onSubmit: (data: { description: string; amount: number; category: string; type: EntryType }) => void
    isLoading?: boolean
}

export function SmartEntryInput({ onSubmit, isLoading }: Props) {
    const { txt, isEnglish } = useLocaleText()
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

    const typeButtons: { value: EntryType; label: string }[] = [
        { value: 'expense', label: txt('Despesa Pontual', 'One-time Expense') },
        { value: 'income', label: txt('Receita', 'Income') },
        { value: 'bill', label: txt('Despesa Fixa', 'Recurring Bill') },
    ]

    return (
        <div className="relative">
            {!isExpanded && (
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                        setIsExpanded(true)
                        setTimeout(() => inputRef.current?.focus(), 100)
                    }}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-xl cursor-pointer group bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-l-2 border-l-[var(--accent)]"
                >
                    <Sparkles size={16} className="text-[var(--color-accent)] opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className="text-sm md:text-base text-[var(--color-text-muted)]">
                        {txt('Regista rapido...', 'Quick add...')} <kbd className="ml-2 px-1.5 py-0.5 rounded text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">Cmd+K</kbd>
                    </span>
                </motion.button>
            )}

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="rounded-2xl overflow-hidden bg-black/60 shadow-2xl backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,90,0,0.15)] ring-1 ring-white/5"
                    >
                        <div className="flex gap-2 p-3 pb-0">
                            {typeButtons.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setSelectedType(t.value)}
                                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${selectedType === t.value
                                            ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                                            : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <button
                                onClick={() => { setValue(''); setIsExpanded(false) }}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] cursor-pointer text-[var(--color-text-muted)]"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 p-4">
                            <Sparkles size={16} className="text-[var(--color-accent)] flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    selectedType === 'expense' ? txt('Ex: Continente 45.50', 'Ex: Grocery Store 45.50')
                                        : selectedType === 'income' ? txt('Ex: Freelance projeto 500', 'Ex: Freelance project 500')
                                            : txt('Ex: EDP eletricidade 65', 'Ex: Utility bill 65')
                                }
                                className="flex-1 bg-transparent text-base outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
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
                                    className="p-2 rounded-full bg-[var(--color-accent)] text-[var(--color-bg-primary)] cursor-pointer disabled:opacity-50"
                                >
                                    <ArrowRight size={14} />
                                </motion.button>
                            )}
                        </div>

                        <AnimatePresence>
                            {parsed?.amount && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 pb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]"
                                >
                                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)]">
                                        {parsed.amount.toFixed(2)} EUR
                                    </span>
                                    <span className="text-[var(--color-border)]">-{'>'}</span>
                                    <span className="font-medium text-[var(--color-text-secondary)]">
                                        {parsed.description}
                                    </span>
                                    {parsed.suggestion && (
                                        <>
                                            <span className="text-[var(--color-border)]">-{'>'}</span>
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    background: parsed.suggestion.confidence > 0.8 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                                    color: parsed.suggestion.confidence > 0.8 ? '#22c55e' : '#eab308',
                                                }}
                                            >
                                                {localizeFinancialCategory(parsed.suggestion.category, isEnglish)}
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
