import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { web3Service } from '@/services/web3Service'
import { coinGeckoService } from '@/services/coinGeckoService'
import { useAuth } from '@/components/core/AuthProvider'
import type { CreateWalletInput, CreateTransactionInput, UnifiedAsset } from '@/types'

const WALLETS_KEY = ['crypto_wallets']
const TRANSACTIONS_KEY = ['crypto_transactions']
const PRICES_KEY = ['crypto_prices']

export function useWeb3() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Wallets
    const walletsQuery = useQuery({
        queryKey: WALLETS_KEY,
        queryFn: () => user ? web3Service.getWallets(user.id) : [],
        enabled: !!user,
    })

    // Transactions (from Supabase)
    const transactionsQuery = useQuery({
        queryKey: TRANSACTIONS_KEY,
        queryFn: () => user ? web3Service.getTransactions(user.id) : [],
        enabled: !!user,
    })

    // Compute holdings from transactions (DCA engine)
    const computedHoldings = transactionsQuery.data
        ? web3Service.computeHoldings(transactionsQuery.data)
        : []

    // Prices (from CoinGecko, auto-refresh every 60s)
    const pricesQuery = useQuery({
        queryKey: [PRICES_KEY, computedHoldings.map(h => h.coingecko_id).filter(Boolean)],
        queryFn: async () => {
            const ids = computedHoldings
                .filter(h => h.coingecko_id)
                .map(h => h.coingecko_id!)
            if (ids.length === 0) return {}
            return coinGeckoService.fetchPrices(ids)
        },
        enabled: computedHoldings.length > 0,
        refetchInterval: 60_000,
    })

    // Merge: computed holdings + prices → UnifiedAsset[]
    const portfolio: UnifiedAsset[] = computedHoldings.map(holding => {
        const priceData = holding.coingecko_id ? pricesQuery.data?.[holding.coingecko_id] : undefined
        const price = priceData?.eur ?? 0
        const value = holding.total_quantity * price

        let unrealized_pnl = 0
        let unrealized_pnl_percent = 0
        if (holding.avg_buy_price > 0 && price > 0) {
            unrealized_pnl = (price - holding.avg_buy_price) * holding.total_quantity
            unrealized_pnl_percent = ((price - holding.avg_buy_price) / holding.avg_buy_price) * 100
        }

        return {
            symbol: holding.symbol,
            name: holding.name,
            image: holding.image,
            chain_id: holding.chain_id,
            wallet_id: holding.wallet_id,
            coingecko_id: holding.coingecko_id,
            quantity: holding.total_quantity,
            avg_buy_price: holding.avg_buy_price,
            total_invested: holding.total_invested,
            price,
            value,
            price_change_24h: priceData?.eur_24h_change ?? 0,
            unrealized_pnl,
            unrealized_pnl_percent,
            realized_pnl: holding.realized_pnl,
            transaction_count: holding.transaction_count,
            transactions: holding.transactions,
        }
    }).sort((a, b) => b.value - a.value)

    // Mutations
    const addWallet = useMutation({
        mutationFn: (input: CreateWalletInput) => {
            if (!user) throw new Error('No user')
            return web3Service.addWallet(user.id, input)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: WALLETS_KEY }),
    })

    const deleteWallet = useMutation({
        mutationFn: (id: string) => {
            if (!user) throw new Error('No user')
            return web3Service.deleteWallet(user.id, id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WALLETS_KEY })
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
        },
    })

    const addTransaction = useMutation({
        mutationFn: (input: CreateTransactionInput) => {
            if (!user) throw new Error('No user')
            return web3Service.addTransaction(user.id, input)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
    })

    const deleteTransaction = useMutation({
        mutationFn: (id: string) => {
            if (!user) throw new Error('No user')
            return web3Service.deleteTransaction(user.id, id)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
    })

    return {
        wallets: walletsQuery,
        transactions: transactionsQuery,
        portfolio,
        isLoadingPortfolio: transactionsQuery.isLoading || pricesQuery.isLoading,
        addWallet,
        deleteWallet,
        addTransaction,
        deleteTransaction,
    }
}
