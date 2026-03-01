/**
 * Semantic Cache — LanceDB-backed vector cache for OpenAI parser responses
 *
 * Before calling OpenAI, we embed the normalized intent and search the cache.
 * If cosine similarity ≥ threshold AND module matches, we return the cached
 * structured JSON response instantly — zero API cost.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import * as lancedb from '@lancedb/lancedb'
import type { Connection, Table } from '@lancedb/lancedb'
import { embedTextLocally } from './localEmbedder.js'
import type { ParsedSemanticIntent } from './openaiParser.js'

export interface SemanticCacheOptions {
    dbUri: string
    tableName?: string
    similarityThreshold?: number
    ttlHours?: number
}

interface CacheRow extends Record<string, unknown> {
    id: string
    input_hash: string
    input_text: string
    response_json: string
    module: string
    created_at: string
    expires_at: string
    hit_count: number
    vector: number[]
}

function nowIso(): string {
    return new Date().toISOString()
}

function hoursFromNow(hours: number): string {
    return new Date(Date.now() + hours * 3600_000).toISOString()
}

function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex')
}

export interface SemanticCacheStats {
    hits: number
    misses: number
    hitRate: number
}

export class SemanticCache {
    private readonly dbUri: string
    private readonly tableName: string
    private readonly similarityThreshold: number
    private readonly ttlHours: number
    private connectionPromise: Promise<Connection> | null = null
    private tablePromise: Promise<Table> | null = null
    private hits = 0
    private misses = 0

    constructor(options: SemanticCacheOptions) {
        this.dbUri = path.resolve(options.dbUri)
        this.tableName = options.tableName ?? 'prompt_cache'
        this.similarityThreshold = options.similarityThreshold ?? 0.95
        this.ttlHours = options.ttlHours ?? 24
        fs.mkdirSync(this.dbUri, { recursive: true })
    }

    private async getConnection(): Promise<Connection> {
        if (!this.connectionPromise) {
            this.connectionPromise = lancedb.connect(this.dbUri)
        }
        return this.connectionPromise
    }

    private async getTable(): Promise<Table> {
        if (!this.tablePromise) {
            this.tablePromise = this.openOrCreateTable()
        }
        return this.tablePromise
    }

    private async openOrCreateTable(): Promise<Table> {
        const connection = await this.getConnection()
        const existing = await connection.tableNames()
        if (existing.includes(this.tableName)) {
            return connection.openTable(this.tableName)
        }

        const bootstrapRow: CacheRow = {
            id: randomUUID(),
            input_hash: sha256('__bootstrap__'),
            input_text: '__bootstrap__',
            response_json: '{}',
            module: '__bootstrap__',
            created_at: nowIso(),
            expires_at: nowIso(),
            hit_count: 0,
            vector: embedTextLocally('bootstrap cache row'),
        }

        await connection.createTable(this.tableName, [bootstrapRow], {
            mode: 'create',
            existOk: true,
        })

        return connection.openTable(this.tableName)
    }

    async lookup(
        normalizedText: string,
        expectedModule?: string,
    ): Promise<ParsedSemanticIntent | null> {
        const trimmed = normalizedText.trim()
        if (!trimmed) return null

        try {
            const table = await this.getTable()
            const vector = embedTextLocally(trimmed)
            const now = nowIso()

            const rows = await table
                .vectorSearch(vector)
                .where(`module != '__bootstrap__' AND expires_at > '${now}'`)
                .limit(3)
                .toArray()

            for (const row of rows) {
                const distance = typeof row._distance === 'number' ? row._distance : 999
                const similarity = 1 / (1 + Math.max(0, distance))

                if (similarity < this.similarityThreshold) continue
                if (expectedModule && row.module !== expectedModule) continue

                const responseJson = String(row.response_json ?? '{}')
                try {
                    const parsed = JSON.parse(responseJson) as ParsedSemanticIntent
                    this.hits++
                    console.log(
                        `[SemanticCache] HIT (similarity=${similarity.toFixed(3)}, module=${row.module}, hits=${this.hits})`
                    )
                    return parsed
                } catch {
                    continue
                }
            }
        } catch (error) {
            console.warn('[SemanticCache] lookup error:', error)
        }

        this.misses++
        return null
    }

    async store(
        normalizedText: string,
        module: string,
        response: ParsedSemanticIntent,
    ): Promise<void> {
        const trimmed = normalizedText.trim()
        if (!trimmed) return

        try {
            const table = await this.getTable()
            const row: CacheRow = {
                id: randomUUID(),
                input_hash: sha256(trimmed),
                input_text: trimmed,
                response_json: JSON.stringify(response),
                module,
                created_at: nowIso(),
                expires_at: hoursFromNow(this.ttlHours),
                hit_count: 0,
                vector: embedTextLocally(trimmed),
            }

            await table.add([row], { mode: 'append' })
            console.log(`[SemanticCache] STORED (module=${module}, text="${trimmed.slice(0, 60)}")`)
        } catch (error) {
            console.warn('[SemanticCache] store error:', error)
        }
    }

    stats(): SemanticCacheStats {
        const total = this.hits + this.misses
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        }
    }
}
