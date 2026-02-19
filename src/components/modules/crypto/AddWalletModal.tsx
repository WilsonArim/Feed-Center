import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, Loader2 } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { ChainType, CreateWalletInput } from '@/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreateWalletInput) => void
    isLoading: boolean
}

export function AddWalletModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
    const [address, setAddress] = useState('')
    const [label, setLabel] = useState('')
    const [chain, setChain] = useState<ChainType>('solana')

    // Address validation: Solana = base58 32-44 chars, EVM = 0x + 40 hex chars
    const isValid = chain === 'evm'
        ? /^0x[a-fA-F0-9]{40}$/.test(address)
        : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValid) return
        onSubmit({ address, label, chain_type: chain })
        setAddress('')
        setLabel('')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-panel w-full max-w-md rounded-[var(--radius-xl)] p-6 relative overflow-hidden"
                        style={{ border: '1px solid var(--color-border)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-[var(--color-accent-soft)]">
                                    <Wallet size={20} className="text-[var(--color-accent)]" />
                                </div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    Adicionar Carteira
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors">
                                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Chain Selector */}
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)]">
                                <button
                                    type="button"
                                    onClick={() => setChain('solana')}
                                    className={`py-2 text-sm font-medium rounded-[var(--radius-md)] transition-all ${chain === 'solana'
                                            ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                >
                                    Solana
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChain('evm')}
                                    className={`py-2 text-sm font-medium rounded-[var(--radius-md)] transition-all ${chain === 'evm'
                                            ? 'bg-[var(--color-accent)] text-white shadow-lg'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                >
                                    EVM (Multi-chain)
                                </button>
                            </div>

                            {/* Address Input */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    Endereço Público *
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder={chain === 'solana' ? 'Ex: 5Zw8mfm7...Key' : 'Ex: 0x742d35Cc...'}
                                    className={`w-full px-4 py-3 rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-secondary)] border outline-none transition-colors ${address && !isValid ? 'border-red-500/50 focus:border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'}`}
                                    style={{ color: 'var(--color-text-primary)' }}
                                    autoFocus
                                />
                                {address && !isValid && (
                                    <p className="text-[10px] mt-1 text-red-400">
                                        {chain === 'evm' ? 'Endereço EVM inválido. Deve começar com 0x e ter 42 caracteres.' : 'Endereço Solana inválido. Base58, 32-44 caracteres.'}
                                    </p>
                                )}
                            </div>

                            {/* Label Input */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    Nome da Carteira (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="Ex: Cofre Principal"
                                    className="w-full px-4 py-3 rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)] transition-colors"
                                    style={{ color: 'var(--color-text-primary)' }}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <StardustButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                >
                                    Cancelar
                                </StardustButton>
                                <StardustButton
                                    type="submit"
                                    size="sm"
                                    disabled={isLoading || !isValid}
                                    icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                >
                                    Conectar (Read-Only)
                                </StardustButton>
                            </div>
                        </form>

                        {/* Security Note */}
                        <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                            🔒 Nunca pedimos chaves privadas. Apenas leitura de endereços públicos.
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
