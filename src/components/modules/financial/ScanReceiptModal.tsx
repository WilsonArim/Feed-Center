import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2, Check, ScanLine, FileText, ListTodo } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { ocrService, type OCRResult } from '@/services/ocrService'

interface ScanReceiptModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (data: { amount: number; merchant: string; date: string; category: string }) => void
    onAddToTodo?: (data: { amount: number; merchant: string; date: string; category: string }) => void
}

export function ScanReceiptModal({ open, onClose, onConfirm, onAddToTodo }: ScanReceiptModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [result, setResult] = useState<OCRResult | null>(null)
    const [msg, setMsg] = useState<string | null>(null)

    // Result form state
    const [amount, setAmount] = useState('')
    const [merchant, setMerchant] = useState('')
    const [date, setDate] = useState('')
    const [category, setCategory] = useState('Despesas')

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
        if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
            setMsg('Formato não suportado. Apenas Imagens e PDF.')
            return
        }
        setMsg(null)
        setFile(f)
        setResult(null)

        if (f.type.startsWith('image/')) {
            const url = URL.createObjectURL(f)
            setPreview(url)
        } else {
            setPreview(null) // PDF doesn't have image preview in this simple implementation
        }
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

    const handleScan = async () => {
        if (!file) return

        setIsScanning(true)
        try {
            const data = await ocrService.scanReceipt(file)
            setResult(data)

            // Auto-fill form
            setAmount(data.total?.amount.toString() || '')
            setMerchant(data.merchant || '')
            setDate(data.date || new Date().toISOString().split('T')[0] || '')

            if (['Pingo Doce', 'Continente', 'Mercadona', 'Lidl'].includes(data.merchant || '')) {
                setCategory('Alimentação')
            } else if (['Galp', 'BP', 'Repsol'].includes(data.merchant || '')) {
                setCategory('Transporte')
            } else if (['Uber', 'Bolt'].includes(data.merchant || '')) {
                setCategory('Transporte')
            } else if (['Worten', 'Fnac', 'Amazon'].includes(data.merchant || '')) {
                setCategory('Compras')
            }

        } catch (error) {
            console.error(error)
            setMsg('Erro ao analisar o recibo. Tente novamente.')
        } finally {
            setIsScanning(false)
        }
    }

    const handleConfirm = () => {
        if (!amount || !merchant) return
        onConfirm({
            amount: parseFloat(amount),
            merchant,
            date,
            category
        })
        resetAndClose()
    }

    const handleCreateTask = () => {
        if (!amount || !merchant) return
        onAddToTodo?.({
            amount: parseFloat(amount),
            merchant,
            date,
            category
        })
        resetAndClose()
    }

    const resetAndClose = () => {
        setFile(null)
        setPreview(null)
        setResult(null)
        setAmount('')
        setMerchant('')
        setDate('')
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
                                    Digitalizar Recibo
                                </h2>
                                <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-white/10" aria-label="Fechar modal">
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
                                                Tirar foto ou Upload
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                                Suporta: Printscreen (Ctrl+V), PDF, Imagens
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
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Image Preview or File Icon */}
                                        <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[3/4] bg-black flex items-center justify-center">
                                            {preview ? (
                                                <img src={preview} alt="Receipt" className="w-full h-full object-contain opacity-80" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <FileText size={48} className="text-[var(--color-text-muted)]" />
                                                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-xs text-[var(--color-text-muted)] bg-white/10 px-2 py-1 rounded">
                                                        PDF Document
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
                                                            Processando IA...
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Result Form */}
                                        {!isScanning && !result && (
                                            <StardustButton onClick={handleScan} className="w-full" icon={<ScanLine size={18} />}>
                                                Analisar Recibo
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
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">Valor</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={amount}
                                                                onChange={(e) => setAmount(e.target.value)}
                                                                className="w-full pl-8 pr-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                            />
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">€</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-[var(--color-text-muted)] block mb-1">Data</label>
                                                        <input
                                                            type="date"
                                                            value={date}
                                                            onChange={(e) => setDate(e.target.value)}
                                                            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[var(--color-text-muted)] block mb-1">Comerciante</label>
                                                    <input
                                                        type="text"
                                                        value={merchant}
                                                        onChange={(e) => setMerchant(e.target.value)}
                                                        className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                                    />
                                                </div>

                                                <div className="flex gap-3">
                                                    <StardustButton onClick={handleCreateTask} className="flex-1" variant="ghost" icon={<ListTodo size={18} />}>
                                                        Criar Tarefa
                                                    </StardustButton>
                                                    {/* <button onClick={() => {
                                                        setAmount('45.50')
                                                        setMerchant('Pingo Doce Teste')
                                                        setDate(new Date().toISOString().split('T')[0])
                                                        setCategory('Alimentação')
                                                        setMsg(null) 
                                                    }} className="hidden">Debug Fill</button> */}
                                                    <StardustButton onClick={handleConfirm} className="flex-1" icon={<Check size={18} />}>
                                                        Confirmar
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
