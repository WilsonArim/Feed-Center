/**
 * UniversalDraftEditor — Human-in-the-Loop Validation UI
 *
 * Replaces the old read-only DraftCard stub.
 * Handles ALL module types: Finance, Todo, Links, Crypto.
 * Called by RealityPane when workspaceStore.view.kind === 'showing_draft'.
 *
 * On Confirm: saves to the correct backend service + invalidates query cache.
 * On Discard: resets the workspace view without saving.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, DollarSign, ListTodo, Link as LinkIcon, TrendingUp, AlertTriangle } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useWorkspaceStore, type DraftPayload } from '@/stores/workspaceStore'
import { useAuth } from '@/components/core/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import { financialService } from '@/services/financialService'
import { todoService } from '@/services/todoService'
import { linksService } from '@/services/linksService'
import { cortexBridgeService, type CortexReflexModule } from '@/services/cortexBridgeService'

// ── Constants ──────────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, typeof DollarSign> = {
    FinanceModule: DollarSign,
    TodoModule: ListTodo,
    LinksModule: LinkIcon,
    CryptoModule: TrendingUp,
}

const MODULE_LABELS: Record<string, { pt: string; en: string }> = {
    FinanceModule: { pt: 'Financeiro', en: 'Finance' },
    TodoModule: { pt: 'Tarefa', en: 'Task' },
    LinksModule: { pt: 'Link', en: 'Link' },
    CryptoModule: { pt: 'Crypto', en: 'Crypto' },
}

const MODULE_QUERY_KEYS: Record<string, string[]> = {
    FinanceModule: ['finances', 'financial_entries'],
    TodoModule: ['todos', 'todo_lists'],
    CryptoModule: ['crypto', 'defi_positions'],
    LinksModule: ['links'],
}

const FINANCE_CATEGORIES = [
    'Alimentação', 'Supermercado', 'Restaurante', 'Transportes', 'Saúde',
    'Tecnologia', 'Serviços', 'Vestuário', 'Entretenimento', 'Educação',
    'Ginásio / Desporto', 'Casa', 'Subscrições', 'Outros',
]

// ── Main Component ─────────────────────────────────────────────────────────

export function DraftCard({ payload }: { payload: DraftPayload }) {
    const { txt } = useLocaleText()
    const { user } = useAuth()
    const reset = useWorkspaceStore((s) => s.reset)
    const showSuccess = useWorkspaceStore((s) => s.showSuccess)
    const showError = useWorkspaceStore((s) => s.showError)

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const Icon = MODULE_ICONS[payload.module] ?? DollarSign
    const label = MODULE_LABELS[payload.module] ?? { pt: 'Módulo', en: 'Module' }

    const handleReject = () => {
        // Resolve the Cortex handshake as 'rejected' so the ledger clears 'pending_confirmation'
        void cortexBridgeService.resolveHandshake({
            rawSignalId: payload.rawSignalId,
            module: payload.module as CortexReflexModule,
            status: 'rejected',
        })
        reset()
    }

    const handleConfirm = async (editedDraft: Record<string, unknown>) => {
        if (!user?.id) { setError('Utilizador não autenticado.'); return }
        setSaving(true)
        setError(null)

        try {
            switch (payload.module) {
                case 'FinanceModule': {
                    const amount = parseFloat(String(editedDraft.amount ?? '').replace(',', '.'))
                    if (!Number.isFinite(amount) || amount <= 0) throw new Error(txt('Montante inválido.', 'Invalid amount.'))
                    const merchant = String(editedDraft.merchant ?? '').trim()
                    if (!merchant) throw new Error(txt('Comerciante obrigatório.', 'Merchant is required.'))

                    const rawCategory = String(editedDraft.category ?? 'Outros')
                    const billCategories = ['Subscrições', 'Ginásio / Desporto', 'Casa']
                    const type = billCategories.includes(rawCategory) ? 'bill' : 'expense'

                    await financialService.createEntry(user.id, {
                        type,
                        amount,
                        currency: String(editedDraft.currency ?? 'EUR'),
                        category: rawCategory,
                        description: String(editedDraft.description ?? '') || undefined,
                        receipt_merchant: merchant,
                        date: new Date().toISOString().split('T')[0]!,
                    })
                    break
                }

                case 'TodoModule': {
                    const title = String(editedDraft.title ?? '').trim()
                    if (!title) throw new Error(txt('Título obrigatório.', 'Title is required.'))
                    await todoService.createTodo(user.id, {
                        title,
                        status: 'todo',
                        priority: (['low', 'medium', 'high'].includes(String(editedDraft.priority))
                            ? editedDraft.priority
                            : 'medium') as 'low' | 'medium' | 'high',
                    })
                    break
                }

                case 'LinksModule': {
                    const url = String(editedDraft.url ?? '').trim()
                    if (!url) throw new Error(txt('URL obrigatório.', 'URL is required.'))
                    await linksService.createLink(user.id, {
                        url,
                        title: String(editedDraft.title ?? '') || undefined,
                        description: String(editedDraft.description ?? '') || undefined,
                    })
                    break
                }

                case 'CryptoModule': {
                    // Crypto requires wallet — escalate to manual for now
                    throw new Error(txt(
                        'Usa o módulo Cripto para registar manualmente transações.',
                        'Use the Crypto module to manually register transactions.'
                    ))
                }

                default:
                    throw new Error(txt('Módulo desconhecido.', 'Unknown module.'))
            }

            // Resolve the Cortex handshake so the ledger clears 'pending_confirmation'
            void cortexBridgeService.resolveHandshake({
                rawSignalId: payload.rawSignalId,
                module: payload.module as CortexReflexModule,
                status: 'approved',
                payload: editedDraft,
            })

            // Invalidate query cache so the Feed refreshes immediately
            const keys = MODULE_QUERY_KEYS[payload.module] ?? []
            for (const key of keys) {
                void queryClient.invalidateQueries({ queryKey: [key] })
            }

            const summary = buildSummary(payload.module, editedDraft, txt)
            showSuccess(payload.module, payload.rawSignalId, summary)

        } catch (err) {
            const message = err instanceof Error ? err.message : txt('Erro ao guardar.', 'Save error.')
            setError(message)
            showError(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="draft-card">
            {/* Header */}
            <div className="draft-card-header">
                <div className="draft-card-module">
                    <Icon size={18} />
                    <span>{txt(label.pt, label.en)}</span>
                </div>
                <div className="draft-card-badge">
                    {txt('Draft', 'Draft')}
                </div>
            </div>

            {/* Module-specific editable form */}
            {payload.module === 'FinanceModule' && (
                <FinanceForm
                    draft={payload.draft}
                    saving={saving}
                    error={error}
                    onConfirm={handleConfirm}
                    onDiscard={handleReject}
                    txt={txt}
                />
            )}
            {payload.module === 'TodoModule' && (
                <TodoForm
                    draft={payload.draft}
                    saving={saving}
                    error={error}
                    onConfirm={handleConfirm}
                    onDiscard={handleReject}
                    txt={txt}
                />
            )}
            {payload.module === 'LinksModule' && (
                <LinksForm
                    draft={payload.draft}
                    saving={saving}
                    error={error}
                    onConfirm={handleConfirm}
                    onDiscard={handleReject}
                    txt={txt}
                />
            )}
            {payload.module === 'CryptoModule' && (
                <CryptoFallbackForm
                    draft={payload.draft}
                    saving={saving}
                    error={error}
                    onConfirm={handleConfirm}
                    onDiscard={handleReject}
                    txt={txt}
                />
            )}
        </div>
    )
}

// ── Shared form actions ────────────────────────────────────────────────────

function FormActions({
    saving,
    onConfirm,
    onDiscard,
    txt,
}: {
    saving: boolean
    onConfirm: () => void
    onDiscard: () => void
    txt: (pt: string, en: string) => string
}) {
    return (
        <div className="draft-card-actions">
            <motion.button
                type="button"
                onClick={onConfirm}
                disabled={saving}
                className="draft-card-btn draft-card-btn-confirm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <Check size={16} />
                {saving ? txt('A guardar…', 'Saving…') : txt('Confirmar', 'Confirm')}
            </motion.button>
            <motion.button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="draft-card-btn draft-card-btn-reject"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <X size={16} />
                {txt('Rejeitar', 'Reject')}
            </motion.button>
        </div>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="draft-card-missing" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--danger)' }}>{message}</span>
        </div>
    )
}

// ── Finance Form ───────────────────────────────────────────────────────────

function FinanceForm({
    draft, saving, error, onConfirm, onDiscard, txt,
}: FormProps) {
    const [merchant, setMerchant] = useState(String(draft.merchant ?? ''))
    const [amount, setAmount] = useState(draft.amount != null ? String(draft.amount) : '')
    const [currency, setCurrency] = useState(String(draft.currency ?? 'EUR'))
    const [category, setCategory] = useState(String(draft.category ?? 'Outros'))
    const [description, setDescription] = useState(String(draft.description ?? ''))

    return (
        <>
            <div className="draft-card-fields">
                <Field label={txt('Comerciante', 'Merchant')}>
                    <input
                        className="draft-field-input"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder={txt('Nome do comerciante', 'Merchant name')}
                        autoFocus
                    />
                </Field>
                <Field label={txt('Valor', 'Amount')}>
                    <input
                        className="draft-field-input"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        inputMode="decimal"
                    />
                </Field>
                <Field label={txt('Moeda', 'Currency')}>
                    <select className="draft-field-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {['EUR', 'USD', 'GBP', 'BRL', 'CHF'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </Field>
                <Field label={txt('Categoria', 'Category')}>
                    <select className="draft-field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {FINANCE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </Field>
                <Field label={txt('Nota (opcional)', 'Note (optional)')}>
                    <input
                        className="draft-field-input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={txt('Descrição adicional', 'Additional description')}
                    />
                </Field>
            </div>
            {error && <ErrorBanner message={error} />}
            <FormActions
                saving={saving}
                onConfirm={() => onConfirm({ merchant, amount, currency, category, description })}
                onDiscard={onDiscard}
                txt={txt}
            />
        </>
    )
}

// ── Todo Form ──────────────────────────────────────────────────────────────

function TodoForm({
    draft, saving, error, onConfirm, onDiscard, txt,
}: FormProps) {
    const [title, setTitle] = useState(String(draft.title ?? ''))
    const [priority, setPriority] = useState(String(draft.priority ?? 'medium'))

    return (
        <>
            <div className="draft-card-fields">
                <Field label={txt('Título', 'Title')}>
                    <input
                        className="draft-field-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={txt('Título da tarefa', 'Task title')}
                        autoFocus
                    />
                </Field>
                <Field label={txt('Prioridade', 'Priority')}>
                    <select className="draft-field-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="low">{txt('Baixa', 'Low')}</option>
                        <option value="medium">{txt('Média', 'Medium')}</option>
                        <option value="high">{txt('Alta', 'High')}</option>
                    </select>
                </Field>
                {Boolean(draft.dueHint) && (
                    <Field label={txt('Prazo sugerido', 'Suggested deadline')}>
                        <span className="draft-field-static">{String(draft.dueHint)}</span>
                    </Field>
                )}
            </div>
            {error && <ErrorBanner message={error} />}
            <FormActions
                saving={saving}
                onConfirm={() => onConfirm({ title, priority })}
                onDiscard={onDiscard}
                txt={txt}
            />
        </>
    )
}

// ── Links Form ─────────────────────────────────────────────────────────────

function LinksForm({
    draft, saving, error, onConfirm, onDiscard, txt,
}: FormProps) {
    const [url, setUrl] = useState(String(draft.url ?? ''))
    const [title, setTitle] = useState(String(draft.title ?? ''))
    const [description, setDescription] = useState(String(draft.description ?? ''))

    return (
        <>
            <div className="draft-card-fields">
                <Field label="URL">
                    <input
                        className="draft-field-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        type="url"
                        autoFocus
                    />
                </Field>
                <Field label={txt('Título (opcional)', 'Title (optional)')}>
                    <input
                        className="draft-field-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={txt('Título do link', 'Link title')}
                    />
                </Field>
                <Field label={txt('Descrição (opcional)', 'Description (optional)')}>
                    <input
                        className="draft-field-input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={txt('Breve descrição', 'Brief description')}
                    />
                </Field>
            </div>
            {error && <ErrorBanner message={error} />}
            <FormActions
                saving={saving}
                onConfirm={() => onConfirm({ url, title, description })}
                onDiscard={onDiscard}
                txt={txt}
            />
        </>
    )
}

// ── Crypto Fallback ────────────────────────────────────────────────────────

function CryptoFallbackForm({
    draft, saving, error, onConfirm, onDiscard, txt,
}: FormProps) {
    return (
        <>
            <div className="draft-card-fields">
                {Object.entries(draft)
                    .filter(([k]) => !['confidence', 'strictParametersMet'].includes(k) && draft[k] !== null)
                    .map(([key, value]) => (
                        <Field key={key} label={key}>
                            <span className="draft-field-static">{String(value)}</span>
                        </Field>
                    ))
                }
            </div>
            <div className="draft-card-missing" style={{ marginBottom: '8px' }}>
                <span className="text-xs" style={{ color: 'var(--warning)' }}>
                    {txt(
                        'Transações cripto requerem seleção de carteira. Usa o módulo Cripto.',
                        'Crypto transactions require wallet selection. Use the Crypto module.'
                    )}
                </span>
            </div>
            {error && <ErrorBanner message={error} />}
            <FormActions
                saving={saving}
                onConfirm={() => onConfirm(draft)}
                onDiscard={onDiscard}
                txt={txt}
            />
        </>
    )
}

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="draft-card-field">
            <span className="draft-card-field-label">{label}</span>
            <span className="draft-card-field-value">{children}</span>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface FormProps {
    draft: Record<string, unknown>
    saving: boolean
    error: string | null
    onConfirm: (edited: Record<string, unknown>) => void
    onDiscard: () => void
    txt: (pt: string, en: string) => string
}

function buildSummary(
    module: string,
    draft: Record<string, unknown>,
    txt: (pt: string, en: string) => string
): string {
    switch (module) {
        case 'FinanceModule':
            return `${draft.merchant ?? '—'} • ${draft.amount ?? '—'} ${draft.currency ?? 'EUR'}`
        case 'TodoModule':
            return String(draft.title ?? txt('Tarefa criada', 'Task created'))
        case 'LinksModule':
            return String(draft.title ?? draft.url ?? txt('Link guardado', 'Link saved'))
        default:
            return txt('Confirmado', 'Confirmed')
    }
}
