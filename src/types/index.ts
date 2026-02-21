export type { User, Session } from '@supabase/supabase-js'

export interface Profile {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
    created_at: string
    updated_at: string
}

export interface UserSettings {
    id: string
    user_id: string
    theme: 'dark' | 'light' | 'auto'
    currency: string
    language: string
    home_page: string
    copilot_name: string
    copilot_avatar_url: string
    show_merchant_insights: boolean
    notifications_email: boolean
    notifications_push: boolean
}

/* ── Financial Module ── */

export type EntryType = 'expense' | 'income' | 'bill'
export type PaymentMethod = 'cash' | 'cartao' | 'mbway' | 'transferencia' | 'outro'

export const CATEGORIES_BY_TYPE: Record<EntryType, readonly string[]> = {
    expense: [
        'Alimentação',
        'Transporte',
        'Saúde',
        'Habitação',
        'Lazer',
        'Educação',
        'Subscriptions',
        'Outros',
    ],
    income: [
        'Salário',
        'Freelance',
        'Investimentos',
        'Reembolso',
        'Outros',
    ],
    bill: [
        'Renda',
        'Eletricidade',
        'Gás',
        'Água',
        'Internet',
        'Seguro',
        'Telecomunicações',
        'Outros',
    ],
} as const

/** Flat list of all categories (for display/icons) */
export const ALL_CATEGORIES = [
    ...new Set(Object.values(CATEGORIES_BY_TYPE).flat()),
] as const

/* ── Pockets / Envelopes ── */

export interface FinancialPocket {
    id: string
    user_id: string
    name: string
    budget_limit: number | null
    current_balance: number
    icon: string
    color: string
    sort_order: number
    created_at: string
    updated_at: string
}

export interface CreatePocketInput {
    name: string
    budget_limit?: number
    icon?: string
    color?: string
}

export interface UpdatePocketInput extends Partial<CreatePocketInput> { }

/* ── Financial Entries ── */

export type Periodicity = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

export interface FinancialEntry {
    id: string
    user_id: string
    type: EntryType
    amount: number
    currency: string
    category: string
    subcategory: string | null
    description: string | null
    date: string
    payment_method: PaymentMethod
    is_recurring: boolean
    recurring_day: number | null
    periodicity: Periodicity | null
    buggy_alert: boolean
    buggy_alert_days: number | null
    receipt_url: string | null
    receipt_merchant: string | null
    receipt_nif: string | null
    pocket_id: string | null
    project_id: string | null
    ai_suggested_category: boolean
    confidence_score: number | null
    created_at: string
    updated_at: string
}

export interface CreateEntryInput {
    type: EntryType
    amount: number
    currency?: string
    category: string
    subcategory?: string
    description?: string
    date: string
    payment_method?: PaymentMethod
    is_recurring?: boolean
    recurring_day?: number
    periodicity?: Periodicity
    buggy_alert?: boolean
    buggy_alert_days?: number
    receipt_merchant?: string
    receipt_nif?: string
    pocket_id?: string
    project_id?: string
}

export interface UpdateEntryInput extends Partial<CreateEntryInput> { }

/* ── AI / Smart Features ── */

export interface CategorySuggestion {
    category: string
    confidence: number
    source: 'heuristic' | 'pattern' | 'ai'
}

export interface AnomalyAlert {
    type: 'type_mismatch' | 'unusual_amount' | 'duplicate_suspect'
    message: string
    severity: 'info' | 'warning' | 'critical'
}

export type AffordabilityLevel = 'safe' | 'caution' | 'danger'

export interface AffordabilityScore {
    level: AffordabilityLevel
    freeBalance: number
    upcomingBills: number
    dailyBudget: number
    daysUntilZero: number | null
}

// -- To-Do Module --
export type TodoStatus = 'todo' | 'in_progress' | 'done'
export type TodoPriority = 'low' | 'medium' | 'high'
export type ListType = 'list' | 'project'

export interface TodoList {
    id: string
    user_id: string
    title: string
    type: ListType
    color: string
    icon: string
    position: number
    budget?: number        // New: Project Budget
    created_at: string
    updated_at: string
}

export interface Todo {
    id: string
    user_id: string
    list_id?: string | null
    title: string
    description?: string
    status: TodoStatus
    priority: TodoPriority
    position: number
    tags?: string[]
    due_date?: string
    created_at?: string
    updated_at?: string
}

export interface CreateTodoInput {
    list_id?: string
    title: string
    description?: string
    status: TodoStatus
    priority: TodoPriority
    position?: number
    tags?: string[]
    due_date?: string
}

export interface UpdateTodoInput extends Partial<CreateTodoInput> {
    id: string
}

export interface CreateListInput {
    title: string
    type: ListType
    color?: string
    icon?: string
    position?: number
}

export interface UpdateListInput extends Partial<CreateListInput> {
    id: string
}

/* ── Crypto Module (Transaction-Based Ledger v2) ── */

export type ChainType = 'solana' | 'evm'
export type HoldingType = 'token' | 'pool' | 'stake' | 'lend'
export type TransactionType = 'buy' | 'sell' | 'swap' | 'airdrop' | 'transfer_in'
export type TransactionSource = 'manual' | 'hash_verified'

export interface CryptoWallet {
    id: string
    user_id: string
    address: string
    chain_type: ChainType
    label?: string
    created_at: string
}

export interface CryptoTransaction {
    id: string
    user_id: string
    wallet_id: string
    type: TransactionType
    coingecko_id?: string
    symbol: string
    name: string
    image?: string
    chain_id?: string
    quantity: number
    price_per_unit?: number
    fee?: number
    fee_token?: string
    pair?: string
    exchange?: string
    tx_hash?: string
    source: TransactionSource
    notes?: string
    executed_at: string
    created_at: string
}

export interface CreateTransactionInput {
    wallet_id: string
    type: TransactionType
    coingecko_id?: string
    symbol: string
    name: string
    image?: string
    chain_id?: string
    quantity: number
    price_per_unit?: number
    fee?: number
    fee_token?: string
    pair?: string
    exchange?: string
    tx_hash?: string
    source: TransactionSource
    notes?: string
    executed_at: string
}

// Computed from transactions (DCA engine output)
export interface ComputedHolding {
    symbol: string
    name: string
    image?: string
    coingecko_id?: string
    chain_id?: string
    wallet_id: string
    total_quantity: number
    avg_buy_price: number
    total_invested: number
    realized_pnl: number
    transaction_count: number
    transactions: CryptoTransaction[]
}

// The aggregated view for the UI (computed holdings + live prices)
export interface UnifiedAsset {
    symbol: string
    name: string
    image?: string
    chain_id?: string
    wallet_id: string
    coingecko_id?: string
    quantity: number
    avg_buy_price: number
    total_invested: number
    price: number
    value: number
    price_change_24h: number
    unrealized_pnl: number
    unrealized_pnl_percent: number
    realized_pnl: number
    transaction_count: number
    transactions: CryptoTransaction[]
}

// Legacy — keeping for DB compat (crypto_holdings table still exists)
export interface CryptoHolding {
    id: string
    user_id: string
    wallet_id: string
    type: HoldingType
    coingecko_id?: string
    symbol: string
    name: string
    image?: string
    pool_address?: string
    pair_label?: string
    dex_id?: string
    chain_id?: string
    quantity: number
    avg_buy_price?: number
    notes?: string
    created_at: string
    updated_at: string
}

export interface CreateWalletInput {
    address: string
    chain_type: ChainType
    label?: string
}

/* ── DeFi Ledger Module ── */

export type DefiPositionType = 'pool' | 'stake' | 'borrow' | 'lend'
export type DefiPositionStatus = 'active' | 'closed'

export interface DefiPosition {
    id: string
    user_id: string
    type: DefiPositionType

    // DexScreener metadata (pool)
    pool_url?: string
    pair_address?: string
    chain_id?: string
    dex_id?: string
    base_symbol?: string
    quote_symbol?: string
    base_address?: string
    quote_address?: string

    // Pool: concentrated liquidity
    tick_lower?: number
    tick_upper?: number
    base_amount?: number
    quote_amount?: number
    entry_price?: number
    initial_value_usd?: number

    // Stake / Borrow / Lend
    token_symbol?: string
    token_amount?: number
    token_price_at_entry?: number
    apy_at_entry?: number

    // Common
    entry_date: string
    notes?: string
    status: DefiPositionStatus
    closed_at?: string
    close_value_usd?: number

    created_at: string
    updated_at: string
}

export interface CreatePoolInput {
    pool_url: string
    pair_address: string
    chain_id: string
    dex_id: string
    base_symbol: string
    quote_symbol: string
    base_address?: string
    quote_address?: string
    tick_lower: number
    tick_upper: number
    base_amount: number
    quote_amount: number
    entry_price: number
    initial_value_usd: number
    entry_date: string
    notes?: string
}

export interface CreateStakeInput {
    token_symbol: string
    token_amount: number
    token_price_at_entry: number
    apy_at_entry?: number
    chain_id?: string
    entry_date: string
    notes?: string
}

export interface CreateBorrowLendInput {
    type: 'borrow' | 'lend'
    token_symbol: string
    token_amount: number
    token_price_at_entry: number
    apy_at_entry?: number
    chain_id?: string
    entry_date: string
    notes?: string
}

export interface DexScreenerPairResolved {
    pairAddress: string
    chainId: string
    dexId: string
    baseSymbol: string
    quoteSymbol: string
    baseAddress: string
    quoteAddress: string
    priceUsd: number
    priceNative: string
    liquidity: number
    url: string
}

export interface VisionOcrResult {
    fields: Record<string, string>
    rawText: string
    confidence: number
}
