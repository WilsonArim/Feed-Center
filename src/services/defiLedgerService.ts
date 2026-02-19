import { supabase } from '@/lib/supabase'
import type {
    DefiPosition,
    DefiPositionType,
    CreatePoolInput,
    CreateStakeInput,
    CreateBorrowLendInput,
    DexScreenerPairResolved,
} from '@/types'

const DEXSCREENER = 'https://api.dexscreener.com'

/**
 * Resolve a DexScreener pool URL into structured pair metadata.
 * Supports formats:
 *   - https://dexscreener.com/{chain}/{pairAddress}
 *   - raw pair address (requires chainId)
 */
export async function resolvePoolFromUrl(url: string): Promise<DexScreenerPairResolved | null> {
    // Parse URL: https://dexscreener.com/solana/ABC123
    const match = url.match(/dexscreener\.com\/(\w+)\/([\w]+)/)
    if (!match) return null

    const [, chainId, pairAddress] = match

    try {
        const res = await fetch(`${DEXSCREENER}/latest/dex/pairs/${chainId}/${pairAddress}`)
        const data = await res.json()
        const pair = data?.pairs?.[0] ?? data?.pair

        if (!pair) return null

        return {
            pairAddress: pair.pairAddress ?? pairAddress,
            chainId: pair.chainId ?? chainId,
            dexId: pair.dexId ?? '',
            baseSymbol: pair.baseToken?.symbol ?? '',
            quoteSymbol: pair.quoteToken?.symbol ?? '',
            baseAddress: pair.baseToken?.address ?? '',
            quoteAddress: pair.quoteToken?.address ?? '',
            priceUsd: parseFloat(pair.priceUsd ?? '0'),
            priceNative: pair.priceNative ?? '0',
            liquidity: pair.liquidity?.usd ?? 0,
            url: pair.url ?? url,
        }
    } catch (err) {
        console.error('DexScreener resolve failed:', err)
        return null
    }
}

/**
 * Fetch current price for a pair by chain + pairAddress.
 * Returns { basePrice, quotePrice } in USD.
 */
export async function fetchPairPrice(chainId: string, pairAddress: string): Promise<{ priceUsd: number; priceNative: number } | null> {
    try {
        const res = await fetch(`${DEXSCREENER}/latest/dex/pairs/${chainId}/${pairAddress}`)
        const data = await res.json()
        const pair = data?.pairs?.[0] ?? data?.pair
        if (!pair) return null
        return {
            priceUsd: parseFloat(pair.priceUsd ?? '0'),
            priceNative: parseFloat(pair.priceNative ?? '0'),
        }
    } catch {
        return null
    }
}

/**
 * Fetch current price for a token symbol via DexScreener search.
 */
export async function fetchTokenPrice(symbol: string): Promise<number> {
    try {
        const res = await fetch(`${DEXSCREENER}/latest/dex/search?q=${symbol}`)
        const data = await res.json()
        const pair = (data?.pairs ?? [])[0]
        return pair ? parseFloat(pair.priceUsd ?? '0') : 0
    } catch {
        return 0
    }
}

const COINGECKO = 'https://api.coingecko.com/api/v3'

// Symbol → CoinGecko ID cache (avoids repeated searches)
const cgIdCache = new Map<string, string>()

/**
 * Resolve a token symbol to its CoinGecko ID.
 */
async function resolveCoinGeckoId(symbol: string): Promise<string | null> {
    const key = symbol.toUpperCase()
    if (cgIdCache.has(key)) return cgIdCache.get(key)!

    try {
        const res = await fetch(`${COINGECKO}/search?query=${symbol}`)
        const data = await res.json()
        const coin = (data?.coins ?? []).find(
            (c: { symbol: string }) => c.symbol?.toUpperCase() === key
        )
        if (coin?.id) {
            cgIdCache.set(key, coin.id)
            return coin.id
        }
    } catch { /* ignore */ }
    return null
}

/**
 * Fetch the historical price (USD) for a token at a specific date/time.
 * Uses CoinGecko market_chart/range with a ±2h window around the target time.
 * Returns the closest price point, or null if not found.
 */
export async function fetchHistoricalPrice(symbol: string, dateISO: string): Promise<number | null> {
    const cgId = await resolveCoinGeckoId(symbol)
    if (!cgId) return null

    const targetTs = Math.floor(new Date(dateISO).getTime() / 1000)
    const from = targetTs - 7200  // -2h
    const to = targetTs + 7200    // +2h

    try {
        const res = await fetch(
            `${COINGECKO}/coins/${cgId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`
        )
        const data = await res.json()
        const prices: [number, number][] = data?.prices ?? []

        if (prices.length === 0) return null

        // Find closest price to targetTs
        let closest = prices[0]!
        let minDiff = Math.abs(closest[0] / 1000 - targetTs)

        for (const p of prices) {
            const diff = Math.abs(p[0] / 1000 - targetTs)
            if (diff < minDiff) {
                closest = p
                minDiff = diff
            }
        }

        return closest[1]
    } catch {
        return null
    }
}

// ── CRUD ──

export async function getPositions(userId: string, type?: DefiPositionType): Promise<DefiPosition[]> {
    let query = supabase
        .from('defi_positions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as DefiPosition[]
}

export async function createPoolPosition(userId: string, input: CreatePoolInput): Promise<DefiPosition> {
    const { data, error } = await supabase
        .from('defi_positions')
        .insert({
            user_id: userId,
            type: 'pool' as const,
            pool_url: input.pool_url,
            pair_address: input.pair_address,
            chain_id: input.chain_id,
            dex_id: input.dex_id,
            base_symbol: input.base_symbol,
            quote_symbol: input.quote_symbol,
            base_address: input.base_address,
            quote_address: input.quote_address,
            tick_lower: input.tick_lower,
            tick_upper: input.tick_upper,
            base_amount: input.base_amount,
            quote_amount: input.quote_amount,
            entry_price: input.entry_price,
            initial_value_usd: input.initial_value_usd,
            entry_date: input.entry_date,
            notes: input.notes,
        })
        .select()
        .single()

    if (error) throw error
    return data as DefiPosition
}

export async function createStakePosition(userId: string, input: CreateStakeInput): Promise<DefiPosition> {
    const { data, error } = await supabase
        .from('defi_positions')
        .insert({
            user_id: userId,
            type: 'stake' as const,
            token_symbol: input.token_symbol,
            token_amount: input.token_amount,
            token_price_at_entry: input.token_price_at_entry,
            apy_at_entry: input.apy_at_entry,
            chain_id: input.chain_id,
            entry_date: input.entry_date,
            notes: input.notes,
        })
        .select()
        .single()

    if (error) throw error
    return data as DefiPosition
}

export async function createBorrowLendPosition(userId: string, input: CreateBorrowLendInput): Promise<DefiPosition> {
    const { data, error } = await supabase
        .from('defi_positions')
        .insert({
            user_id: userId,
            type: input.type,
            token_symbol: input.token_symbol,
            token_amount: input.token_amount,
            token_price_at_entry: input.token_price_at_entry,
            apy_at_entry: input.apy_at_entry,
            chain_id: input.chain_id,
            entry_date: input.entry_date,
            notes: input.notes,
        })
        .select()
        .single()

    if (error) throw error
    return data as DefiPosition
}

export async function closePosition(id: string, closeValueUsd: number): Promise<void> {
    const { error } = await supabase
        .from('defi_positions')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            close_value_usd: closeValueUsd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) throw error
}

export async function deletePosition(id: string): Promise<void> {
    const { error } = await supabase
        .from('defi_positions')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function updatePosition(id: string, updates: Partial<DefiPosition>): Promise<void> {
    const { error } = await supabase
        .from('defi_positions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}
