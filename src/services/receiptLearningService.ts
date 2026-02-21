import type { EntryType } from '@/types'

export interface ReceiptLearningRule {
    merchant: string
    normalizedMerchant: string
    type: EntryType
    category: string
    uses: number
    updatedAt: string
}

function storageKey(userId: string) {
    return `fc-receipt-learning:${userId}`
}

function normalizeMerchant(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function readRules(userId: string): ReceiptLearningRule[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(storageKey(userId))
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((item): item is ReceiptLearningRule => {
            return typeof item?.merchant === 'string'
                && typeof item?.normalizedMerchant === 'string'
                && typeof item?.type === 'string'
                && typeof item?.category === 'string'
        })
    } catch {
        return []
    }
}

function writeRules(userId: string, rules: ReceiptLearningRule[]) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey(userId), JSON.stringify(rules))
}

export const receiptLearningService = {
    findRule(userId: string, merchant: string): ReceiptLearningRule | null {
        const normalized = normalizeMerchant(merchant)
        if (!normalized) return null

        const rules = readRules(userId)
        const exact = rules.find((rule) => rule.normalizedMerchant === normalized)
        if (exact) return exact

        return rules.find((rule) => normalized.includes(rule.normalizedMerchant)) ?? null
    },

    saveRule(userId: string, merchant: string, type: EntryType, category: string) {
        const normalized = normalizeMerchant(merchant)
        if (!normalized || normalized.length < 2) return

        const rules = readRules(userId)
        const now = new Date().toISOString()
        const idx = rules.findIndex((rule) => rule.normalizedMerchant === normalized)

        if (idx >= 0) {
            const current = rules[idx]
            if (!current) return
            rules[idx] = {
                ...current,
                merchant,
                type,
                category,
                uses: current.uses + 1,
                updatedAt: now,
            }
        } else {
            rules.unshift({
                merchant,
                normalizedMerchant: normalized,
                type,
                category,
                uses: 1,
                updatedAt: now,
            })
        }

        // Prevent unbounded growth.
        writeRules(userId, rules.slice(0, 250))
    },
}

