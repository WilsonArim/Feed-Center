import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Star, Edit2, Check, X } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useWallets, useCreateWallet, useUpdateWallet, useDeleteWallet } from '@/hooks/useWallets'
import { useWalletStore, WALLET_KIND_META, type WalletKind } from '@/stores/walletStore'

const WALLET_KINDS: WalletKind[] = ['cash', 'bank', 'digital', 'meal_card', 'crypto', 'other']
const WALLET_COLORS = ['#FF5A00', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6']

export function WalletManager() {
    const { txt } = useLocaleText()
    const { data: wallets = [], isLoading } = useWallets()
    const setDefault = useWalletStore((s) => s.setDefault)
    const createMutation = useCreateWallet()
    const updateMutation = useUpdateWallet()
    const deleteMutation = useDeleteWallet()

    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newKind, setNewKind] = useState<WalletKind>('bank')
    const [newColor, setNewColor] = useState(WALLET_COLORS[0])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const activeWallets = wallets.filter((w) => !w.isArchived)

    const handleCreate = () => {
        if (!newName.trim()) return
        createMutation.mutate({
            name: newName.trim(),
            kind: newKind,
            color: newColor,
            isDefault: activeWallets.length === 0,
        })
        setNewName('')
        setNewKind('bank')
        setShowCreate(false)
    }

    const handleRename = (id: string) => {
        if (!editName.trim()) return
        updateMutation.mutate({ id, name: editName.trim() })
        setEditingId(null)
    }

    if (isLoading) {
        return (
            <div className="text-sm text-[var(--text-tertiary)]">
                {txt('A carregar carteiras...', 'Loading wallets...')}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Wallet list */}
            <div className="space-y-2">
                {activeWallets.map((wallet) => (
                    <motion.div
                        key={wallet.id}
                        layout
                        className="flex items-center gap-3 p-3 rounded-xl
                            bg-[var(--bg-inset)] border border-[var(--border-subtle)]"
                    >
                        {/* Color dot + icon */}
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                            style={{ backgroundColor: wallet.color ?? 'var(--bg-surface)' }}
                        >
                            {wallet.icon ?? WALLET_KIND_META[wallet.kind]?.icon ?? '💳'}
                        </div>

                        {/* Name (editable) */}
                        {editingId === wallet.id ? (
                            <div className="flex-1 flex items-center gap-2">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename(wallet.id)
                                        if (e.key === 'Escape') setEditingId(null)
                                    }}
                                    className="flex-1 bg-transparent border-b border-[var(--accent)]
                                        outline-none text-sm text-[var(--text-primary)] py-0.5"
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleRename(wallet.id)}
                                    className="text-[var(--accent)] hover:text-white cursor-pointer"
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="text-[var(--text-tertiary)] hover:text-white cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {wallet.name}
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                    {txt(WALLET_KIND_META[wallet.kind]?.labelPt ?? 'Outro', WALLET_KIND_META[wallet.kind]?.labelEn ?? 'Other')}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {wallet.isDefault && (
                                <span className="text-[var(--accent)]">
                                    <Star size={14} fill="currentColor" />
                                </span>
                            )}
                            {!wallet.isDefault && (
                                <button
                                    onClick={() => setDefault(wallet.id)}
                                    className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                                    title={txt('Definir como padrão', 'Set as default')}
                                >
                                    <Star size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => { setEditingId(wallet.id); setEditName(wallet.name) }}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                title={txt('Renomear', 'Rename')}
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(txt(`Apagar "${wallet.name}"?`, `Delete "${wallet.name}"?`))) {
                                        deleteMutation.mutate(wallet.id)
                                    }
                                }}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                                title={txt('Apagar', 'Delete')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {activeWallets.length === 0 && (
                    <div className="text-sm text-[var(--text-tertiary)] text-center py-6">
                        {txt('Sem carteiras. Cria a primeira!', 'No wallets yet. Create your first one!')}
                    </div>
                )}
            </div>

            {/* Create form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                placeholder={txt('Nome da carteira (ex: Revolut)', 'Wallet name (e.g. Revolut)')}
                                className="w-full bg-transparent border-b border-[var(--border-default)]
                                    outline-none text-sm text-[var(--text-primary)] py-2
                                    placeholder:text-[var(--text-tertiary)]
                                    focus:border-[var(--accent)] transition-colors"
                                autoFocus
                            />

                            {/* Kind selector */}
                            <div className="flex flex-wrap gap-2">
                                {WALLET_KINDS.map((kind) => (
                                    <button
                                        key={kind}
                                        onClick={() => setNewKind(kind)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${newKind === kind
                                                ? 'bg-[var(--accent)] text-white'
                                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                                            }`}
                                    >
                                        {WALLET_KIND_META[kind].icon} {txt(WALLET_KIND_META[kind].labelPt, WALLET_KIND_META[kind].labelEn)}
                                    </button>
                                ))}
                            </div>

                            {/* Color picker */}
                            <div className="flex gap-2">
                                {WALLET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${newColor === color ? 'scale-125 ring-2 ring-white/40' : ''
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || createMutation.isPending}
                                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold
                                        hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {txt('Criar carteira', 'Create wallet')}
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); setNewName('') }}
                                    className="px-4 py-2 rounded-lg text-xs text-[var(--text-secondary)]
                                        hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                >
                                    {txt('Cancelar', 'Cancel')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add button */}
            {!showCreate && (
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        border border-dashed border-[var(--border-default)]
                        text-sm text-[var(--text-secondary)]
                        hover:border-[var(--accent)] hover:text-[var(--accent)]
                        transition-all cursor-pointer w-full justify-center"
                >
                    <Plus size={16} />
                    {txt('Adicionar carteira', 'Add wallet')}
                </button>
            )}
        </div>
    )
}
