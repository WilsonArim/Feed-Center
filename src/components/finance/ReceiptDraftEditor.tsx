/**
 * ReceiptDraftEditor — Human-in-the-Loop Validation UI
 *
 * DUAL-LLM ARCHITECTURE: This component intercepts BOTH lanes
 * before a database write occurs.
 *
 * - Displays OCR-extracted data: Merchant, Amount, Currency, Category, Date
 * - Shows Confidence Badge (Green >= 0.8, Yellow >= 0.6, Red < 0.6)
 * - Allows inline editing of all fields
 * - On Confirm: saves to Supabase + fires syncVisionContext callback
 * - On Discard: closes without saving
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/components/core/AuthProvider'
import { financialService } from '@/services/financialService'
import { cortexBridgeService, type CortexFinanceDraft } from '@/services/cortexBridgeService'
import './ReceiptDraftEditor.css'

// ── Types ──────────────────────────────────────────────────────────

interface ReceiptDraftEditorProps {
    /** Raw signal ID from the Cortex pipeline */
    rawSignalId: string
    /** The OCR-extracted draft to edit */
    draft: CortexFinanceDraft
    /** Which lane produced this draft */
    lane: 'smart_chat' | 'manual_scan'
    /** Called after successful save + sync */
    onConfirm?: (savedEntry: { id: string }) => void
    /** Called when user discards */
    onDiscard?: () => void
}

const CATEGORIES = [
    'Supermercado',
    'Restaurante',
    'Transportes',
    'Saúde',
    'Tecnologia',
    'Serviços',
    'Vestuário',
    'Entretenimento',
    'Educação',
    'Outros',
]

const CURRENCIES = ['EUR', 'USD', 'GBP', 'BRL', 'CHF']

// ── Confidence Badge ───────────────────────────────────────────────

function confidenceColor(value: number): { bg: string; text: string; label: string } {
    if (value >= 0.8) return { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Alta' }
    if (value >= 0.6) return { bg: 'var(--warning-soft)', text: 'var(--warning)', label: 'Média' }
    return { bg: 'var(--danger-soft)', text: 'var(--danger)', label: 'Baixa' }
}

// ── Component ──────────────────────────────────────────────────────

export function ReceiptDraftEditor({ rawSignalId, draft, lane, onConfirm, onDiscard }: ReceiptDraftEditorProps) {
    const { user } = useAuth()
    const overlayRef = useRef<HTMLDivElement>(null)

    // Editable state initialized from draft
    const [merchant, setMerchant] = useState(draft.merchant ?? '')
    const [amount, setAmount] = useState(draft.amount?.toString() ?? '')
    const [currency, setCurrency] = useState(draft.currency ?? 'EUR')
    const [category, setCategory] = useState(draft.category ?? 'Outros')
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [description, setDescription] = useState(draft.description ?? '')

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const confidence = draft.confidence ?? 0
    const badge = confidenceColor(confidence)
    const isLowConfidence = confidence < 0.6

    // Close on Escape key
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape' && !saving) onDiscard?.()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [saving, onDiscard])

    // Close on overlay click
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === overlayRef.current && !saving) onDiscard?.()
        },
        [saving, onDiscard],
    )

    // ── Phase 7: Confirm → Save to DB + Sync Vision Context ────────
    const handleConfirm = useCallback(async () => {
        if (!user?.id) return
        const parsedAmount = parseFloat(amount.replace(',', '.'))
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Montante inválido.')
            return
        }
        if (!merchant.trim()) {
            setError('Merchant não pode estar vazio.')
            return
        }

        setSaving(true)
        setError(null)

        try {
            // Step 1: Save to Supabase
            const entry = await financialService.createEntry(user.id, {
                type: 'expense',
                amount: parsedAmount,
                currency,
                category,
                description: description || undefined,
                receipt_merchant: merchant.trim(),
                date,
            })

            // Step 2: CRITICAL — Sync corrected data to OpenAI's memory
            const correctedDraft: Partial<CortexFinanceDraft> = {
                merchant: merchant.trim(),
                amount: parsedAmount,
                currency,
                category,
                description: description || undefined,
                confidence: 1.0,
            }
            await cortexBridgeService.syncVisionContext(rawSignalId, correctedDraft)

            // Step 3: Log OCR handshake event for audit trail
            await financialService.logOcrHandshakeEvent(user.id, {
                entryId: entry.id,
                entryLabel: merchant.trim(),
                reason: lane === 'manual_scan' ? 'Manual scan lane' : 'Smart chat lane',
                ocrConfidence: confidence,
                suggestionConfidence: null,
                confidenceGate: 0.6,
                requiresEdit: isLowConfidence,
                editedFields: detectEditedFields(draft, { merchant, amount: parsedAmount, currency, category }),
                ocrEngine: 'local',
                triggerSource: `receipt-draft-editor-${lane}`,
            })

            onConfirm?.({ id: entry.id })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao guardar.')
        } finally {
            setSaving(false)
        }
    }, [
        user, merchant, amount, currency, category, date, description,
        rawSignalId, lane, draft, confidence, isLowConfidence, onConfirm,
    ])

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="rde-overlay"
        >
            <div className="rde-panel">
                {/* Header */}
                <div className="rde-header">
                    <div className="rde-header-left">
                        <span className="rde-title">Validar Recibo</span>
                        <span className="rde-lane-badge">
                            {lane === 'manual_scan' ? '⚡ Scan Local' : '🧠 Chat IA'}
                        </span>
                    </div>
                    <div
                        className="rde-confidence-badge"
                        style={{ background: badge.bg, color: badge.text }}
                    >
                        <span className="rde-confidence-dot" style={{ background: badge.text }} />
                        {Math.round(confidence * 100)}% — {badge.label}
                    </div>
                </div>

                {/* Low confidence warning */}
                {isLowConfidence && (
                    <div className="rde-warning">
                        ⚠️ Verifica os dados com atenção.
                    </div>
                )}

                {/* Form Fields */}
                <div className="rde-form">
                    <div className="rde-field">
                        <label className="rde-label" htmlFor="rde-merchant">Comerciante</label>
                        <input
                            id="rde-merchant"
                            className="rde-input"
                            type="text"
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                            placeholder="Nome do comerciante"
                            autoFocus
                        />
                    </div>

                    <div className="rde-row">
                        <div className="rde-field rde-field-grow">
                            <label className="rde-label" htmlFor="rde-amount">Montante</label>
                            <input
                                id="rde-amount"
                                className="rde-input rde-input-amount"
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="rde-field rde-field-sm">
                            <label className="rde-label" htmlFor="rde-currency">Moeda</label>
                            <select
                                id="rde-currency"
                                className="rde-input rde-select"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rde-row">
                        <div className="rde-field rde-field-grow">
                            <label className="rde-label" htmlFor="rde-category">Categoria</label>
                            <select
                                id="rde-category"
                                className="rde-input rde-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="rde-field rde-field-grow">
                            <label className="rde-label" htmlFor="rde-date">Data</label>
                            <input
                                id="rde-date"
                                className="rde-input"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rde-field">
                        <label className="rde-label" htmlFor="rde-description">Nota (opcional)</label>
                        <input
                            id="rde-description"
                            className="rde-input"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrição adicional"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && <div className="rde-error">{error}</div>}

                {/* Actions */}
                <div className="rde-actions">
                    <button
                        className="rde-btn rde-btn-discard"
                        onClick={onDiscard}
                        disabled={saving}
                        type="button"
                    >
                        Descartar
                    </button>
                    <button
                        className="rde-btn rde-btn-confirm"
                        onClick={handleConfirm}
                        disabled={saving}
                        type="button"
                    >
                        {saving ? 'A guardar...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────

function detectEditedFields(
    original: CortexFinanceDraft,
    edited: { merchant: string; amount: number; currency: string; category: string },
): string[] {
    const fields: string[] = []
    if ((original.merchant ?? '') !== edited.merchant) fields.push('merchant')
    if ((original.amount ?? 0) !== edited.amount) fields.push('amount')
    if ((original.currency ?? 'EUR') !== edited.currency) fields.push('currency')
    if ((original.category ?? 'Outros') !== edited.category) fields.push('category')
    return fields
}
