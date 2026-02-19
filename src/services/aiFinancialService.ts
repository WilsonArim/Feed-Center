import type { EntryType, CategorySuggestion, AnomalyAlert } from '../types'

/* ── Keyword → Category Lookup ── */

interface KeywordRule {
    keywords: string[]
    category: string
    type: EntryType
}

const KEYWORD_RULES: KeywordRule[] = [
    // Expenses
    { keywords: ['continente', 'pingo doce', 'lidl', 'aldi', 'mercadona', 'supermercado', 'mercearia', 'minipreço'], category: 'Alimentação', type: 'expense' },
    { keywords: ['mcdonalds', 'burger king', 'pizza', 'sushi', 'restaurante', 'café', 'padaria', 'pastelaria', 'jantar', 'almoço', 'snack'], category: 'Alimentação', type: 'expense' },
    { keywords: ['uber', 'bolt', 'taxi', 'gasolina', 'gasóleo', 'combustível', 'portagem', 'estacionamento', 'metro', 'comboio', 'autocarro', 'cp', 'galp', 'bp', 'repsol'], category: 'Transporte', type: 'expense' },
    { keywords: ['farmácia', 'hospital', 'médico', 'dentista', 'consulta', 'clínica', 'saúde', 'ótica', 'óculos'], category: 'Saúde', type: 'expense' },
    { keywords: ['ikea', 'leroy merlin', 'bricolage', 'mobília', 'decoração', 'condomínio'], category: 'Habitação', type: 'expense' },
    { keywords: ['cinema', 'spotify', 'netflix', 'disney', 'hbo', 'playstation', 'steam', 'jogo', 'concerto', 'bilhete', 'evento'], category: 'Lazer', type: 'expense' },
    { keywords: ['udemy', 'coursera', 'livro', 'livraria', 'curso', 'formação', 'escola', 'universidade', 'propina'], category: 'Educação', type: 'expense' },
    { keywords: ['amazon prime', 'icloud', 'google one', 'chatgpt', 'github', 'subscription', 'assinatura', 'subscrição', 'mensalidade'], category: 'Subscriptions', type: 'expense' },

    // Income
    { keywords: ['salário', 'vencimento', 'ordenado', 'pagamento empresa', 'nómina'], category: 'Salário', type: 'income' },
    { keywords: ['freelance', 'projeto', 'fatura emitida', 'recibo verde', 'trabalho independente'], category: 'Freelance', type: 'income' },
    { keywords: ['dividendo', 'juro', 'rendimento', 'etf', 'ação', 'crypto gain', 'staking'], category: 'Investimentos', type: 'income' },
    { keywords: ['reembolso', 'devolução', 'cashback', 'refund'], category: 'Reembolso', type: 'income' },

    // Bills
    { keywords: ['renda', 'aluguer', 'hipoteca', 'prestação casa'], category: 'Renda', type: 'bill' },
    { keywords: ['edp', 'eletricidade', 'luz', 'energia'], category: 'Eletricidade', type: 'bill' },
    { keywords: ['água', 'epal', 'saneamento'], category: 'Água', type: 'bill' },
    { keywords: ['internet', 'fibra', 'router', 'wi-fi', 'meo', 'nos', 'vodafone'], category: 'Internet', type: 'bill' },
    { keywords: ['seguro', 'allianz', 'fidelidade', 'tranquilidade', 'ageas', 'ocidental'], category: 'Seguro', type: 'bill' },
    { keywords: ['telecomunicações', 'telemóvel', 'telefone', 'plano móvel'], category: 'Telecomunicações', type: 'bill' },
]

/**
 * Suggest a category based on description text using local heuristics.
 * No API calls — instant, free, privacy-first.
 */
export function suggestCategory(description: string, entryType: EntryType): CategorySuggestion | null {
    if (!description || description.trim().length < 2) return null

    const lower = description.toLowerCase().trim()

    for (const rule of KEYWORD_RULES) {
        if (rule.type !== entryType) continue

        for (const keyword of rule.keywords) {
            if (lower.includes(keyword)) {
                return {
                    category: rule.category,
                    confidence: keyword.length >= 5 ? 0.9 : 0.7,
                    source: 'heuristic',
                }
            }
        }
    }

    return null
}

/**
 * Parse natural language input like "Jantar 25€" or "Uber 15".
 * Returns extracted amount and cleaned description.
 */
export function parseNaturalInput(text: string): { description: string; amount: number | null } {
    const trimmed = text.trim()

    // Match patterns: "descrição 25", "descrição 25€", "descrição 25.50€", "25€ descrição", "€25 descrição"
    const trailingAmount = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*€?\s*$/)
    if (trailingAmount && trailingAmount[1] && trailingAmount[2]) {
        return {
            description: trailingAmount[1].trim(),
            amount: parseFloat(trailingAmount[2].replace(',', '.')),
        }
    }

    const leadingAmount = trimmed.match(/^€?\s*(\d+(?:[.,]\d{1,2})?)\s*€?\s+(.+)$/)
    if (leadingAmount && leadingAmount[1] && leadingAmount[2]) {
        return {
            description: leadingAmount[2].trim(),
            amount: parseFloat(leadingAmount[1].replace(',', '.')),
        }
    }

    return { description: trimmed, amount: null }
}

/**
 * Check for anomalies in a financial entry.
 * Returns alerts if something looks off.
 */
export function checkAnomaly(
    entry: { type: EntryType; amount: number; category: string; description?: string | null },
    categoryAverages: Record<string, number>,
): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = []

    // Type mismatch: income-like categories in expense type
    const incomeKeywords = ['salário', 'freelance', 'reembolso', 'dividendo', 'rendimento']
    if (entry.type === 'expense' && entry.description) {
        const lower = entry.description.toLowerCase()
        if (incomeKeywords.some((k) => lower.includes(k))) {
            alerts.push({
                type: 'type_mismatch',
                message: 'Isto parece ser um rendimento, não uma despesa. Confirmar?',
                severity: 'warning',
            })
        }
    }

    // Unusual amount: > 2x category average
    const avg = categoryAverages[entry.category]
    if (avg && entry.amount > avg * 2) {
        alerts.push({
            type: 'unusual_amount',
            message: `Este valor (${entry.amount}€) é ${Math.round(entry.amount / avg)}x acima da média para ${entry.category}.`,
            severity: 'info',
        })
    }

    return alerts
}

/**
 * Calculate "Saldo Seguro" — balance forecast for next N days.
 * Simple linear projection based on daily average spend + known recurring bills.
 */
export function calculateSafeBalance(
    currentBalance: number,
    avgDailySpend: number,
    upcomingBills: number,
    forecastDays: number = 30,
): { safeBalance: number; daysUntilZero: number | null } {
    const projectedSpend = avgDailySpend * forecastDays
    const safeBalance = currentBalance - projectedSpend - upcomingBills

    let daysUntilZero: number | null = null
    if (avgDailySpend > 0) {
        const availableForDaily = currentBalance - upcomingBills
        if (availableForDaily > 0) {
            daysUntilZero = Math.floor(availableForDaily / avgDailySpend)
        } else {
            daysUntilZero = 0
        }
    }

    return { safeBalance: Math.round(safeBalance * 100) / 100, daysUntilZero }
}

/**
 * Calculate affordability: how much can user safely spend today.
 */
export function getAffordabilityLevel(daysUntilZero: number | null): 'safe' | 'caution' | 'danger' {
    if (daysUntilZero === null) return 'safe'
    if (daysUntilZero >= 30) return 'safe'
    if (daysUntilZero >= 14) return 'caution'
    return 'danger'
}

/**
 * Generate proactive insights for the Serafim widget.
 */
export function getProactiveInsights(
    balance: number,
    daysUntilZero: number | null,
    categoryBreakdown: { category: string; total: number }[],
    upcomingBills: number,
): string[] {
    const insights: string[] = []

    // 1. Safety / Affordability
    if (daysUntilZero !== null) {
        if (daysUntilZero < 7) {
            insights.push(`⚠️ Atenção: O teu saldo atual só cobre mais ${daysUntilZero} dias de despesas habituais.`)
        } else if (daysUntilZero > 30) {
            insights.push(`✅ Estás seguro! Tens margem para mais de 30 dias. Que tal reforçar um envelope de poupança?`)
        }
    }

    // 2. Bills
    if (upcomingBills > 0 && balance < upcomingBills * 1.2) {
        insights.push(`📅 Tens ${upcomingBills}€ em contas fixas a cair. Cuidado com gastos supérfluos hoje.`)
    }

    if (categoryBreakdown.length > 0) {
        const top = categoryBreakdown[0]
        if (top && top.total > 500 && top.category !== 'Habitação') {
            insights.push(`💡 A tua maior despesa este mês é ${top.category} (${top.total}€). Talvez consigas reduzir aqui?`)
        }
    }

    // Default if calm
    if (insights.length === 0) {
        insights.push('Tudo calmo por aqui. Continua o bom trabalho! 🌟')
        insights.push('Sabias? Podes usar ⌘K para registar despesas num instante.')
    }

    return insights
}

