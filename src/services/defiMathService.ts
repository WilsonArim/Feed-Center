/**
 * DeFi Math Service
 *
 * Handles PnL, impermanent loss (IL), and value calculations for:
 * - Concentrated liquidity pools (Uniswap V3 / Raydium CLMM style)
 * - Stake positions (simple token value tracking)
 * - Borrow/Lend positions (token + interest tracking)
 */

import type { DefiPosition } from '@/types'

// ── Pool Calculations ──

/**
 * Calculate the initial USD value of a pool position.
 * Formula: base_amount × base_price + quote_amount × quote_price
 */
export function calcInitialPoolValue(
    baseAmount: number,
    basePrice: number,
    quoteAmount: number,
    quotePrice: number = 1, // stablecoins default to $1
): number {
    return baseAmount * basePrice + quoteAmount * quotePrice
}

/**
 * Check if the current price is within the tick range.
 */
export function isInRange(currentPrice: number, tickLower: number, tickUpper: number): boolean {
    return currentPrice >= tickLower && currentPrice <= tickUpper
}

/**
 * Calculate impermanent loss for a concentrated liquidity position.
 *
 * IL = 2 × √(priceRatio) / (1 + priceRatio) - 1
 *
 * where priceRatio = currentPrice / entryPrice
 *
 * Returns a negative number (e.g. -0.05 = 5% loss)
 */
export function calcImpermanentLoss(entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0 || currentPrice <= 0) return 0
    const ratio = currentPrice / entryPrice
    const sqrtRatio = Math.sqrt(ratio)
    return (2 * sqrtRatio) / (1 + ratio) - 1
}

/**
 * Estimate current pool value based on price movement within tick range.
 *
 * For concentrated liquidity:
 * - If price is in range: tokens redistribute proportionally
 * - If price is below lower tick: position is 100% base token
 * - If price is above upper tick: position is 100% quote token
 */
export function calcCurrentPoolValue(
    position: DefiPosition,
    currentBasePrice: number,
    currentQuotePrice: number = 1,
): number {
    const {
        base_amount = 0,
        quote_amount = 0,
        tick_lower,
        tick_upper,
        entry_price = 0,
    } = position

    // No tick range = simple value calc
    if (!tick_lower || !tick_upper || !entry_price) {
        return base_amount * currentBasePrice + quote_amount * currentQuotePrice
    }

    const currentPrice = currentBasePrice

    // Below range: all converted to base token
    if (currentPrice <= tick_lower) {
        const totalBase = base_amount + quote_amount / tick_lower
        return totalBase * currentBasePrice
    }

    // Above range: all converted to quote token
    if (currentPrice >= tick_upper) {
        const totalQuote = quote_amount + base_amount * tick_upper
        return totalQuote * currentQuotePrice
    }

    // In range: proportional split using Uniswap V3-style math
    // L = liquidity = base_amount × √(tick_upper) × √(currentPrice) / (√(tick_upper) - √(currentPrice))
    const sqrtCurrent = Math.sqrt(currentPrice)
    const sqrtLower = Math.sqrt(tick_lower)
    const sqrtUpper = Math.sqrt(tick_upper)

    // Virtual liquidity from initial position
    const L = base_amount * (sqrtUpper * sqrtCurrent) / (sqrtUpper - sqrtCurrent)

    // Current token amounts
    const currentBase = L * (sqrtUpper - sqrtCurrent) / (sqrtUpper * sqrtCurrent)
    const currentQuote = L * (sqrtCurrent - sqrtLower)

    return currentBase * currentBasePrice + currentQuote * currentQuotePrice
}

/**
 * Calculate full PnL for a pool position.
 */
export function calcPoolPnL(
    position: DefiPosition,
    currentBasePrice: number,
    currentQuotePrice: number = 1,
): { currentValue: number; pnl: number; pnlPercent: number; il: number; inRange: boolean } {
    const initialValue = position.initial_value_usd ?? 0
    const currentValue = calcCurrentPoolValue(position, currentBasePrice, currentQuotePrice)
    const pnl = currentValue - initialValue
    const pnlPercent = initialValue > 0 ? (pnl / initialValue) * 100 : 0
    const il = calcImpermanentLoss(position.entry_price ?? 0, currentBasePrice)
    const inRange = isInRange(
        currentBasePrice,
        position.tick_lower ?? 0,
        position.tick_upper ?? Infinity,
    )

    return { currentValue, pnl, pnlPercent, il, inRange }
}

// ── Stake / Borrow / Lend Calculations ──

/**
 * Calculate PnL for a simple token position (stake, borrow, lend).
 */
export function calcTokenPnL(
    amount: number,
    entryPrice: number,
    currentPrice: number,
): { currentValue: number; initialValue: number; pnl: number; pnlPercent: number } {
    const initialValue = amount * entryPrice
    const currentValue = amount * currentPrice
    const pnl = currentValue - initialValue
    const pnlPercent = initialValue > 0 ? (pnl / initialValue) * 100 : 0

    return { currentValue, initialValue, pnl, pnlPercent }
}
