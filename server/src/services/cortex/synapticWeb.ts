import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import * as lancedb from '@lancedb/lancedb'
import type { Connection, Table } from '@lancedb/lancedb'
import { embedTextLocally } from './localEmbedder.js'
import type { SynapticMemoryInput, SynapticMemoryKind, SynapticSearchHit } from './types.js'

interface SynapticWebOptions {
    dbUri: string
    tableName?: string
}

interface SynapticRow extends Record<string, unknown> {
    id: string
    kind: SynapticMemoryKind | 'bootstrap'
    text: string
    metadata_json: string
    created_at: string
    vector: number[]
}

function nowIso(): string {
    return new Date().toISOString()
}

function parseMetadata(raw: unknown): Record<string, unknown> {
    if (typeof raw !== 'string' || !raw.trim()) return {}
    try {
        const parsed = JSON.parse(raw) as unknown
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
        return {}
    }
}

export class SynapticWeb {
    private readonly dbUri: string
    private readonly tableName: string
    private connectionPromise: Promise<Connection> | null = null
    private tablePromise: Promise<Table> | null = null

    constructor(options: SynapticWebOptions) {
        this.dbUri = path.resolve(options.dbUri)
        this.tableName = options.tableName ?? 'synaptic_memories'
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

        const bootstrapRow: SynapticRow = {
            id: randomUUID(),
            kind: 'bootstrap',
            text: 'bootstrap memory row',
            metadata_json: JSON.stringify({ bootstrap: true }),
            created_at: nowIso(),
            vector: embedTextLocally('bootstrap memory row'),
        }

        await connection.createTable(this.tableName, [bootstrapRow], {
            mode: 'create',
            existOk: true,
        })

        return connection.openTable(this.tableName)
    }

    async storeMemory(input: SynapticMemoryInput): Promise<void> {
        const table = await this.getTable()
        const row: SynapticRow = {
            id: randomUUID(),
            kind: input.kind,
            text: input.text.trim(),
            metadata_json: JSON.stringify(input.metadata ?? {}),
            created_at: nowIso(),
            vector: embedTextLocally(input.text),
        }

        await table.add([row], { mode: 'append' })
    }

    async search(query: string, limit: number = 8): Promise<SynapticSearchHit[]> {
        const trimmed = query.trim()
        if (!trimmed) return []

        const table = await this.getTable()
        const rows = await table
            .vectorSearch(embedTextLocally(trimmed))
            .where("kind != 'bootstrap'")
            .limit(Math.max(1, limit))
            .toArray()

        return rows.map((row) => {
            const distance = typeof row._distance === 'number' ? row._distance : 1
            const similarity = 1 / (1 + Math.max(0, distance))
            return {
                id: String(row.id),
                kind: row.kind as SynapticMemoryKind,
                text: String(row.text ?? ''),
                metadata: parseMetadata(row.metadata_json),
                createdAt: String(row.created_at ?? nowIso()),
                distance,
                similarity,
            }
        })
    }
}
