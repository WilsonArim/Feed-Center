import { supabase } from '@/lib/supabase'
import type {
    CryptoWallet,
    CryptoTransaction,
    CreateWalletInput,
    CreateTransactionInput,
    ComputedHolding,
} from '@/types'

export const web3Service = {

    // ─── Wallets CRUD ───

    async getWallets(userId: string): Promise<CryptoWallet[]> {
        const { data, error } = await supabase
            .from('crypto_wallets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data as CryptoWallet[]
    },

    async addWallet(userId: string, input: CreateWalletInput): Promise<CryptoWallet> {
        const { data, error } = await supabase
            .from('crypto_wallets')
            .insert({ ...input, user_id: userId })
            .select()
            .single()

        if (error) throw error
        return data as CryptoWallet
    },

    async deleteWallet(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('crypto_wallets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    // ─── Transactions CRUD ───

    async getTransactions(userId: string): Promise<CryptoTransaction[]> {
        const { data, error } = await supabase
            .from('crypto_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('executed_at', { ascending: true })

        if (error) throw error
        return (data ?? []) as CryptoTransaction[]
    },

    async addTransaction(userId: string, input: CreateTransactionInput): Promise<CryptoTransaction> {
        const { data, error } = await supabase
            .from('crypto_transactions')
            .insert({ ...input, user_id: userId })
            .select()
            .single()

        if (error) throw error
        return data as CryptoTransaction
    },

    async deleteTransaction(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('crypto_transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    // ─── DCA Calculation Engine ───

    computeHoldings(transactions: CryptoTransaction[]): ComputedHolding[] {
        // Group transactions by symbol
        const groups = new Map<string, CryptoTransaction[]>()
        for (const tx of transactions) {
            const key = tx.symbol
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(tx)
        }

        const holdings: ComputedHolding[] = []

        for (const [symbol, txs] of groups) {
            let totalQty = 0
            let totalCost = 0      // cost basis for DCA
            let realizedPnl = 0

            // Sort by date ascending
            const sorted = [...txs].sort((a, b) =>
                new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
            )

            for (const tx of sorted) {
                const qty = tx.quantity
                const price = tx.price_per_unit ?? 0

                if (tx.type === 'buy' || tx.type === 'airdrop' || tx.type === 'transfer_in') {
                    totalCost += qty * price
                    totalQty += qty
                } else if (tx.type === 'sell') {
                    // Sell: realize PnL based on current avg price
                    const avgPrice = totalQty > 0 ? totalCost / totalQty : 0
                    realizedPnl += qty * (price - avgPrice)

                    // Reduce position: remove proportional cost
                    const costReduction = qty * avgPrice
                    totalCost = Math.max(0, totalCost - costReduction)
                    totalQty = Math.max(0, totalQty - qty)
                } else if (tx.type === 'swap') {
                    // Swap out: treat like a sell at the given price
                    const avgPrice = totalQty > 0 ? totalCost / totalQty : 0
                    realizedPnl += qty * (price - avgPrice)
                    const costReduction = qty * avgPrice
                    totalCost = Math.max(0, totalCost - costReduction)
                    totalQty = Math.max(0, totalQty - qty)
                }

                // Subtract fees from PnL
                if (tx.fee && tx.fee > 0) {
                    realizedPnl -= tx.fee
                }
            }

            const avgBuyPrice = totalQty > 0 ? totalCost / totalQty : 0
            const last = sorted[sorted.length - 1]!

            holdings.push({
                symbol,
                name: last.name,
                image: last.image,
                coingecko_id: last.coingecko_id,
                chain_id: last.chain_id,
                wallet_id: last.wallet_id,
                total_quantity: totalQty,
                avg_buy_price: avgBuyPrice,
                total_invested: totalCost,
                realized_pnl: realizedPnl,
                transaction_count: txs.length,
                transactions: sorted,
            })
        }

        return holdings.filter(h => h.total_quantity > 0 || h.realized_pnl !== 0)
    },
}
