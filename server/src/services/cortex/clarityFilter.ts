import type { DispatcherDecision, LedgerGroundTruthSnapshot, StoredRawSignal, SynapticSearchHit } from './types.js'

interface ClarityFilterInput {
    signal: StoredRawSignal
    dispatcher: DispatcherDecision
    synapticHits: SynapticSearchHit[]
    ledger: LedgerGroundTruthSnapshot
    maxLines: number
}

class MarkdownLineLimiter {
    private readonly maxLines: number
    private readonly lines: string[] = []
    private truncated = false

    constructor(maxLines: number) {
        this.maxLines = Math.max(1, maxLines)
    }

    push(line: string): void {
        if (this.lines.length >= this.maxLines) {
            this.truncated = true
            return
        }
        this.lines.push(line)
    }

    pushAll(lines: string[]): void {
        for (const line of lines) {
            this.push(line)
        }
    }

    toMarkdown(): string {
        if (this.truncated && this.lines.length > 0) {
            const lastIndex = this.lines.length - 1
            this.lines[lastIndex] = `${this.lines[lastIndex]} [TRUNCATED]`
        }
        return this.lines.join('\n')
    }

    get count(): number {
        return this.lines.length
    }
}

function toInlineJson(value: Record<string, unknown>): string {
    const keys = Object.keys(value).slice(0, 6)
    if (keys.length === 0) return '{}'
    const limited: Record<string, unknown> = {}
    for (const key of keys) {
        limited[key] = value[key]
    }
    return JSON.stringify(limited)
}

export function buildClarityContextMarkdown(input: ClarityFilterInput): string {
    const limit = new MarkdownLineLimiter(input.maxLines)

    limit.push('# CORTEX CLARITY CONTEXT')
    limit.push(`- generated_at: ${new Date().toISOString()}`)
    limit.push(`- max_lines: ${input.maxLines}`)
    limit.push(`- used_lines: pending`)
    limit.push('')

    limit.push('## Incoming Signal')
    limit.push(`- id: ${input.signal.id}`)
    limit.push(`- type: ${input.signal.signalType}`)
    limit.push(`- channel: ${input.signal.channel ?? 'unknown'}`)
    limit.push(`- created_at: ${input.signal.createdAt}`)
    limit.push(`- normalized_text: ${input.signal.normalizedText}`)
    limit.push(`- metadata: ${toInlineJson(input.signal.metadata)}`)
    limit.push('')

    limit.push('## Dispatcher Verdict')
    limit.push(`- strategy: ${input.dispatcher.strategy}`)
    limit.push(`- module: ${input.dispatcher.module}`)
    limit.push(`- confidence: ${input.dispatcher.confidence.toFixed(3)}`)
    limit.push(`- strict_parameters: ${input.dispatcher.strictParametersMet ? 'yes' : 'no'}`)
    limit.push(`- extracted_merchant: ${input.dispatcher.extracted.merchant ?? 'null'}`)
    limit.push(`- extracted_amount: ${input.dispatcher.extracted.amount ?? 'null'}`)
    limit.push(`- extracted_currency: ${input.dispatcher.extracted.currency ?? 'null'}`)
    limit.push(`- extracted_todo_title: ${input.dispatcher.extracted.todoTitle ?? 'null'}`)
    limit.push(`- extracted_crypto_action: ${input.dispatcher.extracted.cryptoAction ?? 'null'}`)
    limit.push(`- extracted_crypto_symbol: ${input.dispatcher.extracted.cryptoSymbol ?? 'null'}`)
    limit.push(`- extracted_crypto_amount: ${input.dispatcher.extracted.cryptoAmount ?? 'null'}`)
    limit.push(`- extracted_crypto_price: ${input.dispatcher.extracted.cryptoPrice ?? 'null'}`)
    limit.push(`- extracted_link_url: ${input.dispatcher.extracted.linkUrl ?? 'null'}`)
    limit.push(`- extracted_link_title: ${input.dispatcher.extracted.linkTitle ?? 'null'}`)
    limit.push(`- extracted_keywords: ${input.dispatcher.extracted.keywords.join(', ') || 'none'}`)
    for (const reason of input.dispatcher.reason.slice(0, 8)) {
        limit.push(`- reason: ${reason}`)
    }
    limit.push('')

    limit.push('## Synaptic Web Hits')
    if (input.synapticHits.length === 0) {
        limit.push('- none')
    } else {
        for (const hit of input.synapticHits.slice(0, 12)) {
            limit.push(`- [${hit.kind}] id=${hit.id}`)
            limit.push(`  similarity=${hit.similarity.toFixed(4)} distance=${hit.distance.toFixed(4)} created_at=${hit.createdAt}`)
            limit.push(`  text=${hit.text.slice(0, 220)}`)
            limit.push(`  metadata=${toInlineJson(hit.metadata)}`)
        }
    }
    limit.push('')

    limit.push('## Subconscious Ledger (Recent Raw Signals)')
    for (const row of input.ledger.rawSignals.slice(0, 20)) {
        limit.push(`- ${row.createdAt} [${row.signalType}] ${row.normalizedText.slice(0, 180)}`)
    }
    limit.push('')

    limit.push('## Subconscious Ledger (Recent OCR Traces)')
    for (const row of input.ledger.ocrTraces.slice(0, 20)) {
        limit.push(`- ${row.createdAt} merchant=${row.merchant ?? 'null'} amount=${row.amount ?? 'null'} currency=${row.currency ?? 'null'} confidence=${row.confidence ?? 'null'}`)
    }
    limit.push('')

    limit.push('## Subconscious Ledger (Recent Handshakes)')
    for (const row of input.ledger.handshakes.slice(0, 20)) {
        limit.push(`- ${row.createdAt} module=${row.module} status=${row.status} confidence=${row.confidence ?? 'null'}`)
    }

    const markdown = limit.toMarkdown()
    const lines = markdown.split('\n')
    if (lines.length > input.maxLines) {
        return lines.slice(0, input.maxLines).join('\n')
    }

    if (lines.length >= 3 && lines[2] === '- used_lines: pending') {
        lines[2] = `- used_lines: ${lines.length}`
    }
    return lines.join('\n')
}
