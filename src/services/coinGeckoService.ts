const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const CACHE_KEY = 'fc-coingecko-tokens'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 1 week

export interface CoinGeckoToken {
    id: string        // e.g. 'solana'
    symbol: string     // e.g. 'sol'
    name: string       // e.g. 'Solana'
    image: string      // thumb URL
}

export interface PriceData {
    eur: number
    eur_24h_change: number
}

// ─── Local Cache Management ───

function getCachedTokens(): CoinGeckoToken[] | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const { tokens, timestamp } = JSON.parse(raw)
        if (Date.now() - timestamp > CACHE_TTL) return null
        return tokens as CoinGeckoToken[]
    } catch {
        return null
    }
}

function setCachedTokens(tokens: CoinGeckoToken[]) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        tokens,
        timestamp: Date.now(),
    }))
}

// ─── Public API ───

export const coinGeckoService = {

    /** Load top 500 tokens into local cache (call once on app init or weekly) */
    async loadTopTokens(): Promise<CoinGeckoToken[]> {
        const cached = getCachedTokens()
        if (cached) return cached

        try {
            // Fetch top 250 x 2 pages (CoinGecko max 250 per page)
            const [page1, page2] = await Promise.all([
                fetch(`${COINGECKO_API}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false`),
                fetch(`${COINGECKO_API}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=2&sparkline=false`),
            ])

            const [data1, data2] = await Promise.all([page1.json(), page2.json()])
            const allCoins = [...(data1 || []), ...(data2 || [])]

            const tokens: CoinGeckoToken[] = allCoins.map((coin: any) => ({
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                image: coin.image || '',
            }))

            setCachedTokens(tokens)
            return tokens
        } catch (err) {
            console.error('Failed to load CoinGecko top tokens:', err)
            return []
        }
    },

    /** Search tokens: cache-first with CoinGecko /search fallback */
    async searchTokens(query: string): Promise<CoinGeckoToken[]> {
        if (!query.trim()) return []

        const q = query.toLowerCase()

        // 1. Try local cache first
        const cached = getCachedTokens()
        if (cached) {
            const localResults = cached.filter(t =>
                t.symbol.toLowerCase().includes(q) ||
                t.name.toLowerCase().includes(q)
            ).slice(0, 10)

            if (localResults.length > 0) return localResults
        }

        // 2. Fallback to CoinGecko search API
        try {
            const res = await fetch(`${COINGECKO_API}/search?query=${encodeURIComponent(query)}`)
            const data = await res.json()
            return ((data?.coins ?? []) as any[])
                .slice(0, 10)
                .map((coin: any) => ({
                    id: coin.id,
                    symbol: (coin.symbol || '').toUpperCase(),
                    name: coin.name,
                    image: coin.large || coin.thumb || '',
                }))
        } catch {
            return []
        }
    },

    /** Fetch current prices for a set of CoinGecko IDs */
    async fetchPrices(coinGeckoIds: string[]): Promise<Record<string, PriceData>> {
        if (coinGeckoIds.length === 0) return {}

        const ids = coinGeckoIds.filter(Boolean).join(',')
        if (!ids) return {}

        try {
            const res = await fetch(
                `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`
            )
            const data = await res.json()

            const prices: Record<string, PriceData> = {}
            for (const id of coinGeckoIds) {
                if (data[id]) {
                    prices[id] = {
                        eur: data[id].eur ?? 0,
                        eur_24h_change: data[id].eur_24h_change ?? 0,
                    }
                }
            }
            return prices
        } catch (err) {
            console.error('CoinGecko price fetch failed:', err)
            return {}
        }
    },
}
