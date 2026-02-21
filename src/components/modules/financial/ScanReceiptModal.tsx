import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, Check, ScanLine, FileText, ListTodo, ShieldCheck } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { ocrService, type OCRReceiptItem, type OCRResult, type OCREngine } from '@/services/ocrService'
import { useLocaleText } from '@/i18n/useLocaleText'
import { CATEGORIES_BY_TYPE, type EntryType } from '@/types'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'
import { useAuth } from '@/components/core/AuthProvider'
import { receiptLearningService } from '@/services/receiptLearningService'

interface ScannedFinancialPayload {
    amount: number
    merchant: string
    nif?: string | null
    receiptItems?: OCRReceiptItem[]
    date: string
    category: string
    type: EntryType
    isRecurring?: boolean
    buggyAlert?: boolean
}

interface ScanReceiptModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (data: ScannedFinancialPayload) => void
    onAddToTodo?: (data: ScannedFinancialPayload) => void
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function getTodayIso() {
    return new Date().toISOString().split('T')[0] ?? ''
}

function toIsoDate(raw: string | null | undefined): string | null {
    if (!raw) return null
    if (ISO_DATE_RE.test(raw)) return raw

    const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
    if (dmy?.[1] && dmy[2] && dmy[3]) {
        const day = Number(dmy[1])
        const month = Number(dmy[2])
        const yearRaw = Number(dmy[3])
        const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
        if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
    }

    return null
}

function parseAmountInput(value: string): number | null {
    const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
}

function getEntryTypeLabel(entryType: EntryType, txt: (pt: string, en: string) => string): string {
    if (entryType === 'expense') return txt('Despesa', 'Expense')
    if (entryType === 'bill') return txt('Despesa Fixa', 'Bill')
    return txt('Receita', 'Income')
}

type SuggestionOrigin = 'memory' | 'heuristic' | 'manual'

export function ScanReceiptModal({ open, onClose, onConfirm, onAddToTodo }: ScanReceiptModalProps) {
    const { txt, isEnglish } = useLocaleText()
    const { user } = useAuth()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [result, setResult] = useState<OCRResult | null>(null)
    const [msg, setMsg] = useState<string | null>(null)

    // Result form state
    const [amount, setAmount] = useState('')
    const [merchant, setMerchant] = useState('')
    const [nif, setNif] = useState('')
    const [date, setDate] = useState('')
    const [entryType, setEntryType] = useState<EntryType>('expense')
    const [category, setCategory] = useState(CATEGORIES_BY_TYPE.expense[0] ?? 'Outros')
    const [autoRecurring, setAutoRecurring] = useState(false)
    const [suggestionOrigin, setSuggestionOrigin] = useState<SuggestionOrigin>('manual')
    const [suggestionConfidence, setSuggestionConfidence] = useState<number | null>(null)
    const [ocrEngine, setOcrEngine] = useState<OCREngine | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Handle Paste (Screenshots)
    useEffect(() => {
        if (!open) return

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.files
            if (items && items.length > 0 && items[0]) {
                processFile(items[0])
            }
        }
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [open])

    const processFile = (f: File) => {
        // Validate type
        if (!f.type.startsWith('image/')) {
            setMsg(txt('Formato não suportado. Usa imagem (PNG/JPG/WebP).', 'Unsupported format. Use image (PNG/JPG/WebP).'))
            return
        }
        setMsg(null)
        setFile(f)
        setResult(null)
        const url = URL.createObjectURL(f)
        setPreview(url)
        // Nuclear loop: capture -> understand -> act without extra clicks.
        void runScan(f)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0])
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const runScan = async (targetFile: File) => {
        setIsScanning(true)
        setMsg(null)
        try {
            const data = await ocrService.scanReceipt(targetFile)
            setResult(data)
            setOcrEngine(data.engine)

            // Auto-fill form
            setAmount(data.total?.amount !== null && data.total?.amount !== undefined ? data.total.amount.toFixed(2) : '')
            setMerchant(data.merchant || '')
            setNif(data.nif ?? '')
            setDate(toIsoDate(data.date) ?? getTodayIso())
            const learnedRule = user && data.merchant
                ? receiptLearningService.findRule(user.id, data.merchant)
                : null

            const suggestedType = learnedRule?.type ?? data.suggestion?.type ?? 'expense'
            const suggestedCategory = learnedRule?.category ?? data.suggestion?.category ?? null
            const categoriesForType = CATEGORIES_BY_TYPE[suggestedType]

            setEntryType(suggestedType)
            if (suggestedCategory && categoriesForType.includes(suggestedCategory)) {
                setCategory(suggestedCategory)
            } else {
                setCategory(categoriesForType[0] ?? 'Outros')
            }
            setAutoRecurring(suggestedType === 'bill')
            if (learnedRule) {
                setSuggestionOrigin('memory')
                setSuggestionConfidence(0.99)
            } else if (data.suggestion) {
                setSuggestionOrigin('heuristic')
                setSuggestionConfidence(data.suggestion.confidence)
            } else {
                setSuggestionOrigin('manual')
                setSuggestionConfidence(null)
            }

        } catch (error) {
            console.error(error)
            setMsg(error instanceof Error ? error.message : txt('Erro ao analisar o recibo. Tente novamente.', 'Error analyzing receipt. Please try again.'))
        } finally {
            setIsScanning(false)
        }
    }

    const handleScan = async () => {
        if (!file) return
        await runScan(file)
    }

    const handleConfirm = () => {
        const parsedAmount = parseAmountInput(amount)
        if (!parsedAmount || !merchant) return

        if (user?.id && merchant.trim().length >= 2) {
            receiptLearningService.saveRule(user.id, merchant, entryType, category)
        }

        onConfirm({
            amount: parsedAmount,
            merchant,
            nif: nif.trim() || null,
            receiptItems: result?.receiptItems ?? [],
            date: toIsoDate(date) ?? getTodayIso(),
            category,
            type: entryType,
            isRecurring: entryType === 'bill' ? autoRecurring : undefined,
            buggyAlert: entryType === 'bill' ? autoRecurring : undefined,
        })
        resetAndClose()
    }

    const handleCreateTask = () => {
        const parsedAmount = parseAmountInput(amount)
        if (!parsedAmount || !merchant) return
        onAddToTodo?.({
            amount: parsedAmount,
            merchant,
            nif: nif.trim() || null,
            date: toIsoDate(date) ?? getTodayIso(),
            category,
            type: entryType,
        })
        resetAndClose()
    }

    const resetAndClose = () => {
        setFile(null)
        setPreview(null)
        setResult(null)
        setAmount('')
        setMerchant('')
        setNif('')
        setDate('')
        setEntryType('expense')
        setCategory(CATEGORIES_BY_TYPE.expense[0] ?? 'Outros')
        setAutoRecurring(false)
        setSuggestionOrigin('manual')
        setSuggestionConfidence(null)
        setOcrEngine(null)
        setMsg(null)
        onClose()
    }

    useEffect(() => {
        if (!open) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') resetAndClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [open])

    useEffect(() => {
        const categoriesForType = CATEGORIES_BY_TYPE[entryType]
        if (!categoriesForType.includes(category)) {
            setCategory(categoriesForType[0] ?? 'Outros')
        }
    }, [entryType, category])

    useEffect(() => {
        if (entryType !== 'bill' && autoRecurring) {
            setAutoRecurring(false)
        }
    }, [entryType, autoRecurring])

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={resetAndClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="modal-panel rounded-2xl w-full max-w-md overflow-hidden pointer-events-auto shadow-2xl flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                            style={{ borderColor: 'var(--color-border)' }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="scan-receipt-modal-title"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                                <h2 id="scan-receipt-modal-title" className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {txt('Digitalizar Recibo', 'Scan Receipt')}
                                </h2>
                                <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-white/10" aria-label={txt('Fechar modal', 'Close modal')}>
                                    <X size={20} style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto">
                                {!file ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        className="border-2 border-dashed border-[var(--color-border)] rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-accent)] transition-colors gap-3 relative overflow-hidden group"
                                        style={{ background: 'var(--color-bg-secondary)' }}
                                    >
                                        <div className="p-4 rounded-full bg-[var(--color-bg-primary)] shadow-sm group-hover:scale-110 transition-transform">
                                            <Camera size={32} style={{ color: 'var(--color-text-secondary)' }} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                {txt('Tirar foto ou Upload', 'Take photo or Upload')}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                                {txt('Suporta: Printscreen (Ctrl+V) e Imagens', 'Supports: Screenshot (Ctrl+V) and Images')}
                                            </p>
                                        </div>

                                        {msg && (
                                            <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-red-400">
                                                {msg}
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Image Preview or File Icon */}
                                        <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[3/4] bg-black flex items-center justify-center">
                                            {preview ? (
                                                <img src={preview} alt={txt('Recibo', 'Receipt')} className="w-full h-full object-contain opacity-80" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <FileText size={48} className="text-[var(--color-text-muted)]" />
                                                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-xs text-[var(--color-text-muted)] bg-white/10 px-2 py-1 rounded">
                                                        {txt('Documento PDF', 'PDF Document')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Scanning Line Animation */}
                                            {isScanning && (
                                                <motion.div
                                                    initial={{ top: '0%' }}
                                                    animate={{ top: '100%' }}
                                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                                    className="absolute left-0 right-0 h-1 bg-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)] z-10"
                                                />
                                            )}

                                            {/* Overlay during scan */}
                                            {isScanning && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
                                                        <span className="text-xs font-mono text-white/90 uppercase tracking-widest">
                                                            {txt('Processando IA...', 'Processing AI...')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Result Form */}
                                        {!isScanning && !result && (
                                            <StardustButton onClick={handleScan} className="w-full" icon={<ScanLine size={18} />}>
                                                {txt('Analisar Recibo', 'Analyze Receipt')}
                                            </StardustButton>
                                        )}

                                        {!isScanning && result && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-4"
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">{txt('Valor', 'Amount')}</label>
                                                        <div className="flex items-center bg-[var(--color-bg-secondary)] rounded-lg focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
                                                            <span className="pl-3 pr-2 text-sm text-[var(--color-text-muted)]">€</span>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={amount}
                                                                onChange={(e) => setAmount(e.target.value)}
                                                                className="w-full min-w-0 bg-transparent pr-3 py-2 rounded-r-lg text-sm outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">{txt('Data', 'Date')}</label>
                                                        <input
                                                            type="date"
                                                            value={date}
                                                            onChange={(e) => setDate(e.target.value)}
                                                            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[var(--color-text-muted)] block mb-1">{txt('Comerciante', 'Merchant')}</label>
                                                    <input
                                                        type="text"
                                                        value={merchant}
                                                        onChange={(e) => setMerchant(e.target.value)}
                                                        className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-[var(--color-text-muted)] block mb-1">NIF</label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={nif}
                                                        onChange={(e) => setNif(e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
                                                        className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                        placeholder="000000000"
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">{txt('Tipo de movimento', 'Entry type')}</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['expense', 'bill', 'income'] as EntryType[]).map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEntryType(type)
                                                                        if (type === 'bill') setAutoRecurring(true)
                                                                        setSuggestionOrigin('manual')
                                                                        setSuggestionConfidence(null)
                                                                    }}
                                                                    className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors border cursor-pointer ${entryType === type
                                                                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/40'
                                                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                                                                        }`}
                                                                >
                                                                    {getEntryTypeLabel(type, txt)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">{txt('Categoria', 'Category')}</label>
                                                        <select
                                                            value={category}
                                                            onChange={(e) => {
                                                                setCategory(e.target.value)
                                                                setSuggestionOrigin('manual')
                                                                setSuggestionConfidence(null)
                                                            }}
                                                            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                                                        >
                                                            {CATEGORIES_BY_TYPE[entryType].map((categoryOption) => (
                                                                <option key={categoryOption} value={categoryOption}>
                                                                    {localizeFinancialCategory(categoryOption, isEnglish)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                                                        <ShieldCheck size={13} className="text-[var(--color-accent)]" />
                                                        <span>
                                                            {txt('Confianca OCR', 'OCR confidence')}: {Math.round((result.confidence ?? 0) * 100)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-text-muted)]">
                                                        {txt('Motor', 'Engine')}: {ocrEngine === 'vision' ? 'Google Vision' : txt('OCR local', 'Local OCR')}
                                                        {' • '}
                                                        {txt('Origem da classificacao', 'Classification source')}: {
                                                            suggestionOrigin === 'memory'
                                                                ? txt('Memoria aprendida', 'Learned memory')
                                                                : suggestionOrigin === 'heuristic'
                                                                    ? txt('Heuristica IA', 'AI heuristic')
                                                                    : txt('Manual', 'Manual')
                                                        }
                                                        {suggestionConfidence !== null ? ` • ${txt('Confianca da sugestao', 'Suggestion confidence')}: ${Math.round(suggestionConfidence * 100)}%` : ''}
                                                    </p>
                                                </div>

                                                {entryType === 'bill' && (
                                                    <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={autoRecurring}
                                                            onChange={(e) => setAutoRecurring(e.target.checked)}
                                                            className="mt-0.5 accent-[var(--color-accent)]"
                                                        />
                                                        <div>
                                                            <p className="text-xs font-medium text-[var(--color-text-primary)]">
                                                                {txt('Ativar automacao desta conta fixa', 'Enable automation for this recurring bill')}
                                                            </p>
                                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                                {txt('O Buggy vai priorizar esta categoria e sugerir alerta recorrente.', 'Buggy will prioritize this category and suggest recurring alerts.')}
                                                            </p>
                                                        </div>
                                                    </label>
                                                )}

                                                <div className="flex gap-3">
                                                    <StardustButton onClick={handleCreateTask} className="flex-1" variant="ghost" icon={<ListTodo size={18} />}>
                                                        {txt('Criar Tarefa', 'Create Task')}
                                                    </StardustButton>
                                                    <StardustButton onClick={handleConfirm} className="flex-1" icon={<Check size={18} />}>
                                                        {txt('Adicionar às Finanças', 'Add to Finance')}
                                                    </StardustButton>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
