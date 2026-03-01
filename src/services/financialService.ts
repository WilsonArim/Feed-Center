import { supabase } from '@/lib/supabase'
import type { FinancialEntry, CreateEntryInput, UpdateEntryInput, FinancialPocket, CreatePocketInput, UpdatePocketInput, AffordabilityScore } from '@/types'
import { calculateSafeBalance, getAffordabilityLevel } from './aiFinancialService'
import type { OCRReceiptItem } from './ocrService'

export interface GetEntriesOptions {
    month: string          // 'YYYY-MM'
    type?: string
    category?: string
    projectId?: string     // New
}

export interface MonthSummary {
    income: number
    expenses: number
    balance: number
    projectTotal?: number  // New
}

export interface CategoryBreakdown {
    category: string
    total: number
    percentage: number
}

export interface MerchantInsight {
    merchant: string
    nif: string | null
    monthTotal: number
    transactions: number
    avgTicket: number
    previousAvgTicket: number | null
    inflationPct: number | null
}

export interface ItemInflationInsight {
    skuKey: string
    itemName: string
    monthQuantity: number
    monthTotal: number
    currentAvgUnitPrice: number
    previousAvgUnitPrice: number | null
    inflationPct: number | null
}

export interface RecurringCandidate {
    key: string
    merchant: string
    category: string
    suggestedAmount: number
    occurrences: number
    monthsCovered: number
    recurringDay: number
    confidence: number
    latestEntryId: string
    latestDate: string
}

export type FinancialAutomationAction = 'automate_recurring' | 'undo_automate_recurring' | 'ocr_handshake'

export interface LogOcrHandshakeEventInput {
    entryId: string
    entryLabel: string
    reason: string | null
    ocrConfidence: number
    suggestionConfidence: number | null
    confidenceGate: number
    requiresEdit: boolean
    editedFields: string[]
    ocrEngine: 'vision' | 'local'
    triggerSource?: string
    previousType?: string | null
    previousIsRecurring?: boolean | null
    previousPeriodicity?: string | null
    previousRecurringDay?: number | null
    previousBuggyAlert?: boolean | null
    previousBuggyAlertDays?: number | null
    newType?: string | null
    newIsRecurring?: boolean | null
    newPeriodicity?: string | null
    newRecurringDay?: number | null
    newBuggyAlert?: boolean | null
    newBuggyAlertDays?: number | null
}

export interface FinancialAutomationHistoryItem {
    id: string
    entryId: string
    action: FinancialAutomationAction
    triggerSource: string
    reason: string | null
    entryLabel: string | null
    createdAt: string
    revertedAt: string | null
    targetEventId: string | null
}

function monthRange(month: string) {
    const parts = month.split('-')
    const y = Number(parts[0])
    const m = Number(parts[1])
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end }
}

function previousMonth(month: string) {
    const parts = month.split('-')
    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

function toMonthKey(dateValue: string) {
    return dateValue.slice(0, 7)
}

function buildEntryLabel(row: { receipt_merchant?: string | null; description?: string | null; category?: string | null }) {
    const label = (row.receipt_merchant ?? row.description ?? row.category ?? '').trim()
    return label || 'Movimento financeiro'
}

export const financialService = {
    async getEntries(userId: string, options: GetEntriesOptions): Promise<FinancialEntry[]> {
        const { start, end } = monthRange(options.month)

        let query = supabase
            .from('financial_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false })

        if (options.type) query = query.eq('type', options.type)
        if (options.category) query = query.eq('category', options.category)
        if (options.projectId) query = query.eq('project_id', options.projectId)

        const { data, error } = await query
        if (error) throw error
        return (data ?? []) as FinancialEntry[]
    },

    async getMonthSummary(userId: string, month: string, projectId?: string): Promise<MonthSummary> {
        const { start, end } = monthRange(month)

        let query = supabase
            .from('financial_entries')
            .select('type, amount')
            .eq('user_id', userId)
            .gte('date', start)
            .lte('date', end)

        if (projectId) {
            query = query.eq('project_id', projectId)
        }

        const { data, error } = await query

        if (error) throw error

        const entries = data ?? []
        const income = entries
            .filter((e) => e.type === 'income')
            .reduce((sum, e) => sum + Number(e.amount), 0)
        const expenses = entries
            .filter((e) => e.type === 'expense' || e.type === 'bill')
            .reduce((sum, e) => sum + Number(e.amount), 0)

        return { income, expenses, balance: income - expenses, projectTotal: projectId ? expenses : undefined }
    },

    async getProjectSummary(projectId: string): Promise<{ totalSpent: number; entries: FinancialEntry[] }> {
        const { data, error } = await supabase
            .from('financial_entries')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: false })

        if (error) throw error

        const entries = (data ?? []) as FinancialEntry[]
        const totalSpent = entries.reduce((sum, e) => {
            if (e.type === 'expense' || e.type === 'bill') {
                return sum + Number(e.amount)
            }
            return sum
        }, 0)

        return { totalSpent, entries }
    },

    async getCategoryBreakdown(userId: string, month: string): Promise<CategoryBreakdown[]> {
        const { start, end } = monthRange(month)

        const { data, error } = await supabase
            .from('financial_entries')
            .select('category, amount')
            .eq('user_id', userId)
            .in('type', ['expense', 'bill'])
            .gte('date', start)
            .lte('date', end)

        if (error) throw error

        const entries = data ?? []
        const totals: Record<string, number> = {}
        let grandTotal = 0

        for (const e of entries) {
            const cat = e.category || 'Outros'
            totals[cat] = (totals[cat] ?? 0) + Number(e.amount)
            grandTotal += Number(e.amount)
        }

        return Object.entries(totals)
            .map(([category, total]) => ({
                category,
                total,
                percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total)
    },

    async createEntry(userId: string, input: CreateEntryInput): Promise<FinancialEntry> {
        const { data, error } = await supabase
            .from('financial_entries')
            .insert({
                user_id: userId,
                type: input.type,
                amount: input.amount,
                currency: input.currency ?? 'EUR',
                category: input.category,
                subcategory: input.subcategory ?? null,
                description: input.description ?? null,
                receipt_merchant: input.receipt_merchant ?? null,
                receipt_nif: input.receipt_nif ?? null,
                date: input.date,
                payment_method: input.payment_method ?? 'cash',
                is_recurring: input.is_recurring ?? false,
                recurring_day: input.recurring_day ?? null,
                periodicity: input.periodicity ?? null,
                buggy_alert: input.buggy_alert ?? false,
                buggy_alert_days: input.buggy_alert_days ?? null,
                pocket_id: input.pocket_id ?? null,
                project_id: input.project_id ?? null,
            })
            .select()
            .single()

        if (error) throw error
        return data as FinancialEntry
    },

    async getMerchantInsights(userId: string, month: string): Promise<MerchantInsight[]> {
        const { start: currentStart, end: currentEnd } = monthRange(month)
        const prevMonth = previousMonth(month)
        const { start: previousStart } = monthRange(prevMonth)

        const { data, error } = await supabase
            .from('financial_entries')
            .select('amount, date, description, receipt_merchant, receipt_nif, type')
            .eq('user_id', userId)
            .in('type', ['expense', 'bill'])
            .gte('date', previousStart)
            .lte('date', currentEnd)

        if (error) throw error

        type Agg = {
            merchant: string
            nif: string | null
            currentTotal: number
            currentCount: number
            previousTotal: number
            previousCount: number
        }

        const grouped = new Map<string, Agg>()

        for (const row of data ?? []) {
            const merchantRaw = (row.receipt_merchant ?? row.description ?? '').trim()
            if (!merchantRaw) continue

            const merchant = merchantRaw.replace(/\s+/g, ' ')
            const key = normalizeMerchant(merchant)
            if (!key) continue

            const current = grouped.get(key) ?? {
                merchant,
                nif: row.receipt_nif ?? null,
                currentTotal: 0,
                currentCount: 0,
                previousTotal: 0,
                previousCount: 0,
            }

            if (!current.nif && row.receipt_nif) {
                current.nif = row.receipt_nif
            }

            const amount = Number(row.amount) || 0
            const date = String(row.date)
            const isCurrentMonth = date >= currentStart && date <= currentEnd

            if (isCurrentMonth) {
                current.currentTotal += amount
                current.currentCount += 1
            } else {
                current.previousTotal += amount
                current.previousCount += 1
            }

            grouped.set(key, current)
        }

        const insights: MerchantInsight[] = []
        for (const group of grouped.values()) {
            if (group.currentCount === 0) continue

            const avgTicket = group.currentTotal / group.currentCount
            const previousAvgTicket = group.previousCount > 0
                ? group.previousTotal / group.previousCount
                : null
            const inflationPct = previousAvgTicket && previousAvgTicket > 0
                ? Number((((avgTicket - previousAvgTicket) / previousAvgTicket) * 100).toFixed(1))
                : null

            insights.push({
                merchant: group.merchant,
                nif: group.nif,
                monthTotal: Number(group.currentTotal.toFixed(2)),
                transactions: group.currentCount,
                avgTicket: Number(avgTicket.toFixed(2)),
                previousAvgTicket: previousAvgTicket === null ? null : Number(previousAvgTicket.toFixed(2)),
                inflationPct,
            })
        }

        return insights
            .sort((a, b) => b.monthTotal - a.monthTotal)
            .slice(0, 8)
    },

    async replaceReceiptItems(
        userId: string,
        entryId: string,
        payload: {
            purchasedAt: string
            merchant?: string | null
            nif?: string | null
            items: OCRReceiptItem[]
        },
    ): Promise<void> {
        const { error: deleteError } = await supabase
            .from('financial_receipt_items')
            .delete()
            .eq('entry_id', entryId)
            .eq('user_id', userId)

        if (deleteError) throw deleteError

        if (!payload.items || payload.items.length === 0) return

        const rows = payload.items.map((item) => ({
            user_id: userId,
            entry_id: entryId,
            purchased_at: payload.purchasedAt,
            merchant: payload.merchant ?? null,
            receipt_nif: payload.nif ?? null,
            item_name: item.description,
            sku_key: item.skuKey,
            quantity: item.quantity,
            line_total: item.lineTotal,
            unit_price: item.unitPrice,
            raw_line: item.rawLine,
            confidence_score: null,
        }))

        const { error: insertError } = await supabase
            .from('financial_receipt_items')
            .insert(rows)

        if (insertError) throw insertError
    },

    async getItemInflationInsights(userId: string, month: string): Promise<ItemInflationInsight[]> {
        const { start: currentStart, end: currentEnd } = monthRange(month)
        const prevMonth = previousMonth(month)
        const { start: previousStart } = monthRange(prevMonth)

        const { data, error } = await supabase
            .from('financial_receipt_items')
            .select('sku_key, item_name, quantity, line_total, unit_price, purchased_at')
            .eq('user_id', userId)
            .gte('purchased_at', previousStart)
            .lte('purchased_at', currentEnd)

        if (error) throw error

        type Agg = {
            skuKey: string
            itemName: string
            currentQty: number
            currentTotal: number
            previousQty: number
            previousTotal: number
        }

        const grouped = new Map<string, Agg>()

        for (const row of data ?? []) {
            const skuKey = String(row.sku_key ?? '').trim()
            if (!skuKey) continue

            const current = grouped.get(skuKey) ?? {
                skuKey,
                itemName: String(row.item_name ?? skuKey),
                currentQty: 0,
                currentTotal: 0,
                previousQty: 0,
                previousTotal: 0,
            }

            const qtyRaw = Number(row.quantity)
            const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1
            const totalRaw = Number(row.line_total)
            const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : 0
            const date = String(row.purchased_at ?? '')
            const inCurrentMonth = date >= currentStart && date <= currentEnd

            if (inCurrentMonth) {
                current.currentQty += qty
                current.currentTotal += total
            } else {
                current.previousQty += qty
                current.previousTotal += total
            }

            grouped.set(skuKey, current)
        }

        const insights: ItemInflationInsight[] = []
        for (const item of grouped.values()) {
            if (item.currentQty <= 0 || item.currentTotal <= 0) continue

            const currentAvg = item.currentTotal / item.currentQty
            const previousAvg = item.previousQty > 0 ? item.previousTotal / item.previousQty : null
            const inflationPct = previousAvg && previousAvg > 0
                ? Number((((currentAvg - previousAvg) / previousAvg) * 100).toFixed(1))
                : null

            insights.push({
                skuKey: item.skuKey,
                itemName: item.itemName,
                monthQuantity: Number(item.currentQty.toFixed(3)),
                monthTotal: Number(item.currentTotal.toFixed(2)),
                currentAvgUnitPrice: Number(currentAvg.toFixed(4)),
                previousAvgUnitPrice: previousAvg === null ? null : Number(previousAvg.toFixed(4)),
                inflationPct,
            })
        }

        return insights
            .sort((a, b) => {
                const aInflationWeight = a.inflationPct === null ? -Infinity : Math.abs(a.inflationPct)
                const bInflationWeight = b.inflationPct === null ? -Infinity : Math.abs(b.inflationPct)
                if (bInflationWeight !== aInflationWeight) return bInflationWeight - aInflationWeight
                return b.monthTotal - a.monthTotal
            })
            .slice(0, 12)
    },

    async getActiveRecurringBills(userId: string): Promise<FinancialEntry[]> {
        // Fetch recent bills (last 6 months) that have alerts enabled
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const { data, error } = await supabase
            .from('financial_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'bill')
            .eq('buggy_alert', true)
            .gte('date', sixMonthsAgo.toISOString().split('T')[0])
            .order('date', { ascending: false })

        if (error) throw error

        // Deduplicate by category+description to get the latest instance of each bill
        const uniqueBills = new Map<string, FinancialEntry>()
        for (const entry of data ?? []) {
            const key = `${entry.category}-${entry.description}`
            if (!uniqueBills.has(key)) {
                uniqueBills.set(key, entry)
            }
        }

        return Array.from(uniqueBills.values())
    },

    async getRecurringCandidates(userId: string): Promise<RecurringCandidate[]> {
        const lookback = new Date()
        lookback.setMonth(lookback.getMonth() - 6)
        const lookbackDate = lookback.toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('financial_entries')
            .select('id, type, amount, category, description, receipt_merchant, date, is_recurring')
            .eq('user_id', userId)
            .in('type', ['expense', 'bill'])
            .gte('date', lookbackDate)
            .order('date', { ascending: false })

        if (error) throw error

        type GroupEntry = {
            id: string
            amount: number
            date: string
            isRecurring: boolean
            type: string
        }
        type Group = {
            key: string
            merchant: string
            category: string
            rows: GroupEntry[]
            months: Set<string>
            latest: GroupEntry | null
        }

        const grouped = new Map<string, Group>()
        for (const row of data ?? []) {
            const merchantRaw = String((row.receipt_merchant ?? row.description ?? row.category ?? '').trim())
            const merchantNormalized = normalizeMerchant(merchantRaw)
            if (!merchantNormalized) continue

            const category = String(row.category ?? 'Outros')
            const key = `${merchantNormalized}|${category.toLowerCase()}`
            const amount = Number(row.amount)
            if (!Number.isFinite(amount) || amount <= 0) continue

            const date = String(row.date)
            const group = grouped.get(key) ?? {
                key,
                merchant: merchantRaw.replace(/\s+/g, ' ') || category,
                category,
                rows: [],
                months: new Set<string>(),
                latest: null,
            }

            const entry: GroupEntry = {
                id: String(row.id),
                amount,
                date,
                isRecurring: Boolean(row.is_recurring),
                type: String(row.type),
            }

            group.rows.push(entry)
            group.months.add(toMonthKey(date))
            if (!group.latest || entry.date > group.latest.date) {
                group.latest = entry
            }

            grouped.set(key, group)
        }

        const candidates: RecurringCandidate[] = []
        for (const group of grouped.values()) {
            if (!group.latest) continue
            if (group.rows.length < 2) continue
            if (group.months.size < 2) continue
            if (group.latest.isRecurring) continue

            const amounts = group.rows.map((r) => r.amount)
            const avg = amounts.reduce((sum, value) => sum + value, 0) / amounts.length
            const variance = amounts.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / amounts.length
            const stdDev = Math.sqrt(variance)
            const variability = avg > 0 ? stdDev / avg : 1

            // Ignore highly volatile spending patterns.
            if (variability > 0.35) continue

            const latestDate = group.latest.date
            const recurringDay = Number(latestDate.split('-')[2] ?? '1')
            const recurringTypeBoost = group.latest.type === 'bill' ? 0.1 : 0
            const coverageBoost = group.months.size >= 3 ? 0.2 : 0.1
            const stabilityBoost = variability <= 0.12 ? 0.25 : variability <= 0.2 ? 0.15 : 0.05
            const confidence = Math.min(0.96, Number((0.45 + recurringTypeBoost + coverageBoost + stabilityBoost).toFixed(2)))

            candidates.push({
                key: group.key,
                merchant: group.merchant,
                category: group.category,
                suggestedAmount: Number(avg.toFixed(2)),
                occurrences: group.rows.length,
                monthsCovered: group.months.size,
                recurringDay: Number.isFinite(recurringDay) ? recurringDay : 1,
                confidence,
                latestEntryId: group.latest.id,
                latestDate,
            })
        }

        return candidates
            .sort((a, b) => {
                if (b.confidence !== a.confidence) return b.confidence - a.confidence
                if (b.monthsCovered !== a.monthsCovered) return b.monthsCovered - a.monthsCovered
                return b.occurrences - a.occurrences
            })
            .slice(0, 5)
    },

    async automateRecurringEntry(userId: string, entryId: string): Promise<FinancialEntry> {
        const { data: current, error: readError } = await supabase
            .from('financial_entries')
            .select('id, user_id, type, date, recurring_day, periodicity, is_recurring, buggy_alert, buggy_alert_days, description, receipt_merchant, category')
            .eq('id', entryId)
            .eq('user_id', userId)
            .single()

        if (readError) throw readError

        const recurringDay = Number(String(current.date).split('-')[2] ?? current.recurring_day ?? 1)
        const nextState = {
            type: current.type === 'income' ? 'income' : 'bill',
            is_recurring: true,
            periodicity: 'mensal',
            recurring_day: Number.isFinite(recurringDay) ? recurringDay : 1,
            buggy_alert: true,
            buggy_alert_days: 3,
        } as const

        const { data, error } = await supabase
            .from('financial_entries')
            .update({
                type: nextState.type,
                is_recurring: nextState.is_recurring,
                periodicity: nextState.periodicity,
                recurring_day: nextState.recurring_day,
                buggy_alert: nextState.buggy_alert,
                buggy_alert_days: nextState.buggy_alert_days,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error

        const entryLabel = buildEntryLabel(current)
        const { error: eventError } = await supabase
            .from('financial_automation_events')
            .insert({
                user_id: userId,
                entry_id: entryId,
                action: 'automate_recurring',
                trigger_source: 'today-page',
                reason: 'Detected recurring expense pattern',
                entry_label: entryLabel,
                previous_type: current.type,
                previous_is_recurring: current.is_recurring,
                previous_periodicity: current.periodicity,
                previous_recurring_day: current.recurring_day,
                previous_buggy_alert: current.buggy_alert,
                previous_buggy_alert_days: current.buggy_alert_days,
                new_type: nextState.type,
                new_is_recurring: nextState.is_recurring,
                new_periodicity: nextState.periodicity,
                new_recurring_day: nextState.recurring_day,
                new_buggy_alert: nextState.buggy_alert,
                new_buggy_alert_days: nextState.buggy_alert_days,
            })

        if (eventError) {
            console.warn('Failed to log recurring automation event.', eventError.message)
        }

        return data as FinancialEntry
    },

    async undoRecurringAutomation(userId: string, eventId: string): Promise<FinancialEntry> {
        const { data: eventRow, error: readError } = await supabase
            .from('financial_automation_events')
            .select('*')
            .eq('id', eventId)
            .eq('user_id', userId)
            .single()

        if (readError) throw readError
        if (eventRow.action !== 'automate_recurring') {
            throw new Error('Only automate_recurring events can be undone.')
        }
        if (eventRow.reverted_at) {
            throw new Error('This automation was already reverted.')
        }

        const { data: currentEntry, error: currentEntryError } = await supabase
            .from('financial_entries')
            .select('id, type, is_recurring, periodicity, recurring_day, buggy_alert, buggy_alert_days')
            .eq('id', eventRow.entry_id)
            .eq('user_id', userId)
            .single()

        if (currentEntryError) throw currentEntryError

        const restoredState = {
            type: eventRow.previous_type ?? currentEntry.type,
            is_recurring: typeof eventRow.previous_is_recurring === 'boolean' ? eventRow.previous_is_recurring : currentEntry.is_recurring,
            periodicity: eventRow.previous_periodicity ?? null,
            recurring_day: typeof eventRow.previous_recurring_day === 'number' ? eventRow.previous_recurring_day : null,
            buggy_alert: typeof eventRow.previous_buggy_alert === 'boolean' ? eventRow.previous_buggy_alert : currentEntry.buggy_alert,
            buggy_alert_days: typeof eventRow.previous_buggy_alert_days === 'number' ? eventRow.previous_buggy_alert_days : null,
        }

        const { data: updatedEntry, error: restoreError } = await supabase
            .from('financial_entries')
            .update({
                type: restoredState.type,
                is_recurring: restoredState.is_recurring,
                periodicity: restoredState.periodicity,
                recurring_day: restoredState.recurring_day,
                buggy_alert: restoredState.buggy_alert,
                buggy_alert_days: restoredState.buggy_alert_days,
                updated_at: new Date().toISOString(),
            })
            .eq('id', eventRow.entry_id)
            .eq('user_id', userId)
            .select()
            .single()

        if (restoreError) throw restoreError

        const { data: undoEvent, error: undoEventError } = await supabase
            .from('financial_automation_events')
            .insert({
                user_id: userId,
                entry_id: eventRow.entry_id,
                action: 'undo_automate_recurring',
                trigger_source: 'today-page',
                reason: 'Undo recurring automation',
                entry_label: eventRow.entry_label,
                previous_type: currentEntry.type,
                previous_is_recurring: currentEntry.is_recurring,
                previous_periodicity: currentEntry.periodicity,
                previous_recurring_day: currentEntry.recurring_day,
                previous_buggy_alert: currentEntry.buggy_alert,
                previous_buggy_alert_days: currentEntry.buggy_alert_days,
                new_type: restoredState.type,
                new_is_recurring: restoredState.is_recurring,
                new_periodicity: restoredState.periodicity,
                new_recurring_day: restoredState.recurring_day,
                new_buggy_alert: restoredState.buggy_alert,
                new_buggy_alert_days: restoredState.buggy_alert_days,
                target_event_id: eventRow.id,
            })
            .select('id')
            .single()

        if (undoEventError) {
            console.warn('Failed to log undo recurring automation event.', undoEventError.message)
            return updatedEntry as FinancialEntry
        }

        const { error: markRevertedError } = await supabase
            .from('financial_automation_events')
            .update({
                reverted_at: new Date().toISOString(),
                reverted_by_event_id: undoEvent.id,
            })
            .eq('id', eventRow.id)
            .eq('user_id', userId)

        if (markRevertedError) {
            console.warn('Failed to mark automation event as reverted.', markRevertedError.message)
        }

        return updatedEntry as FinancialEntry
    },

    async logOcrHandshakeEvent(userId: string, input: LogOcrHandshakeEventInput): Promise<void> {
        const { error } = await supabase
            .from('financial_automation_events')
            .insert({
                user_id: userId,
                entry_id: input.entryId,
                action: 'ocr_handshake',
                trigger_source: input.triggerSource ?? 'financeiro-inline-ocr',
                reason: input.reason,
                entry_label: input.entryLabel,
                ocr_confidence: input.ocrConfidence,
                suggestion_confidence: input.suggestionConfidence,
                confidence_gate: input.confidenceGate,
                requires_edit: input.requiresEdit,
                edited_fields: input.editedFields,
                ocr_engine: input.ocrEngine,
                previous_type: input.previousType ?? null,
                previous_is_recurring: input.previousIsRecurring ?? null,
                previous_periodicity: input.previousPeriodicity ?? null,
                previous_recurring_day: input.previousRecurringDay ?? null,
                previous_buggy_alert: input.previousBuggyAlert ?? null,
                previous_buggy_alert_days: input.previousBuggyAlertDays ?? null,
                new_type: input.newType ?? null,
                new_is_recurring: input.newIsRecurring ?? null,
                new_periodicity: input.newPeriodicity ?? null,
                new_recurring_day: input.newRecurringDay ?? null,
                new_buggy_alert: input.newBuggyAlert ?? null,
                new_buggy_alert_days: input.newBuggyAlertDays ?? null,
            })

        if (error) {
            console.warn('Failed to log OCR handshake event.', error.message)
        }
    },

    async getAutomationHistory(userId: string, limit: number = 12): Promise<FinancialAutomationHistoryItem[]> {
        const { data, error } = await supabase
            .from('financial_automation_events')
            .select('id, entry_id, action, trigger_source, reason, entry_label, created_at, reverted_at, target_event_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return (data ?? []).map((row) => ({
            id: String(row.id),
            entryId: String(row.entry_id),
            action: row.action as FinancialAutomationAction,
            triggerSource: String(row.trigger_source ?? 'unknown'),
            reason: row.reason ?? null,
            entryLabel: row.entry_label ?? null,
            createdAt: String(row.created_at),
            revertedAt: row.reverted_at ?? null,
            targetEventId: row.target_event_id ?? null,
        }))
    },

    async updateEntry(userId: string, id: string, input: UpdateEntryInput): Promise<FinancialEntry> {
        const { data, error } = await supabase
            .from('financial_entries')
            .update({ ...input, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data as FinancialEntry
    },

    async deleteEntry(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    /* ── Pockets CRUD ── */

    async getPockets(userId: string): Promise<FinancialPocket[]> {
        const { data, error } = await supabase
            .from('financial_pockets')
            .select('*')
            .eq('user_id', userId)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return (data ?? []) as FinancialPocket[]
    },

    async createPocket(userId: string, input: CreatePocketInput): Promise<FinancialPocket> {
        const { data, error } = await supabase
            .from('financial_pockets')
            .insert({
                user_id: userId,
                name: input.name,
                budget_limit: input.budget_limit ?? null,
                icon: input.icon ?? '📁',
                color: input.color ?? '#3b82f6',
            })
            .select()
            .single()

        if (error) throw error
        return data as FinancialPocket
    },

    async updatePocket(userId: string, id: string, input: UpdatePocketInput): Promise<FinancialPocket> {
        const { data, error } = await supabase
            .from('financial_pockets')
            .update({ ...input, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data as FinancialPocket
    },

    async deletePocket(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_pockets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    /* ── Affordability Score ── */

    async getAffordabilityScore(userId: string, month: string): Promise<AffordabilityScore> {
        const summary = await this.getMonthSummary(userId, month)

        // Get recurring bills total
        const { data: recurringBills } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('user_id', userId)
            .eq('is_recurring', true)
            .in('type', ['bill', 'expense'])

        const upcomingBills = (recurringBills ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

        // Get daily average spend (last 90 days)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const { data: recentExpenses } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('user_id', userId)
            .in('type', ['expense'])
            .gte('date', ninetyDaysAgo.toISOString().split('T')[0])

        const totalRecentSpend = (recentExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
        const avgDailySpend = totalRecentSpend / 90

        const { safeBalance, daysUntilZero } = calculateSafeBalance(
            summary.balance,
            avgDailySpend,
            upcomingBills,
        )

        return {
            level: getAffordabilityLevel(daysUntilZero),
            freeBalance: safeBalance,
            upcomingBills,
            dailyBudget: avgDailySpend > 0 ? Math.round((summary.balance - upcomingBills) / 30 * 100) / 100 : 0,
            daysUntilZero,
        }
    },

    /* ── Category averages for anomaly detection ── */

    async getCategoryAverages(userId: string): Promise<Record<string, number>> {
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data, error } = await supabase
            .from('financial_entries')
            .select('category, amount')
            .eq('user_id', userId)
            .gte('date', threeMonthsAgo.toISOString().split('T')[0])

        if (error) throw error

        const categoryTotals: Record<string, { sum: number; count: number }> = {}
        for (const e of data ?? []) {
            const cat = e.category || 'Outros'
            if (!categoryTotals[cat]) categoryTotals[cat] = { sum: 0, count: 0 }
            categoryTotals[cat].sum += Number(e.amount)
            categoryTotals[cat].count += 1
        }

        const averages: Record<string, number> = {}
        for (const [cat, { sum, count }] of Object.entries(categoryTotals)) {
            averages[cat] = count > 0 ? sum / count : 0
        }

        return averages
    },
}
