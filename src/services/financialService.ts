import { supabase } from '@/lib/supabase'
import type { FinancialEntry, CreateEntryInput, UpdateEntryInput, FinancialPocket, CreatePocketInput, UpdatePocketInput, AffordabilityScore } from '@/types'
import { calculateSafeBalance, getAffordabilityLevel } from './aiFinancialService'

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

function monthRange(month: string) {
    const parts = month.split('-')
    const y = Number(parts[0])
    const m = Number(parts[1])
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end }
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
