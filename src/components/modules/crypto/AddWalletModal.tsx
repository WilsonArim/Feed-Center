import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, Loader2 } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { ChainType, CreateWalletInput } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreateWalletInput) => void
    isLoading: boolean
}

export function AddWalletModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
    const { txt } = useLocaleText()
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

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-wallet-modal-title"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-[var(--color-accent-soft)]">
                                    <Wallet size={20} className="text-[var(--color-accent)]" />
                                </div>
                                <h2 id="add-wallet-modal-title" className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {txt('Adicionar Carteira', 'Add Wallet')}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors" aria-label={txt('Fechar modal', 'Close modal')}>
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
                                    {txt('Endereco Publico *', 'Public Address *')}
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
                                        {chain === 'evm'
                                            ? txt('Endereco EVM invalido. Deve comecar com 0x e ter 42 caracteres.', 'Invalid EVM address. Must start with 0x and have 42 characters.')
                                            : txt('Endereco Solana invalido. Base58, 32-44 caracteres.', 'Invalid Solana address. Base58, 32-44 characters.')}
                                    </p>
                                )}
                            </div>

                            {/* Label Input */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    {txt('Nome da Carteira (Opcional)', 'Wallet Name (Optional)')}
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder={txt('Ex: Cofre Principal', 'Ex: Main Vault')}
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
                                    {txt('Cancelar', 'Cancel')}
                                </StardustButton>
                                <StardustButton
                                    type="submit"
                                    size="sm"
                                    disabled={isLoading || !isValid}
                                    icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                >
                                    {txt('Conectar (Read-Only)', 'Connect (Read-Only)')}
                                </StardustButton>
                            </div>
                        </form>

                        {/* Security Note */}
                        <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                            🔒 {txt('Nunca pedimos chaves privadas. Apenas leitura de enderecos publicos.', 'We never ask for private keys. Public-address read-only access only.')}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
