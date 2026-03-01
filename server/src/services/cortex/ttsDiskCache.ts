/**
 * TTS Disk Cache — File-based cache for OpenAI TTS audio
 *
 * Hash the (voice + text) payload → check if <hash>.opus exists on disk →
 * serve the local file → otherwise call OpenAI and store the result.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

export interface TtsDiskCacheOptions {
    cacheDir: string
    maxAgeDays?: number
}

export interface TtsCacheStats {
    fileCount: number
    totalSizeBytes: number
    totalSizeMB: string
}

export class TtsDiskCache {
    private readonly cacheDir: string
    private readonly maxAgeDays: number
    private hits = 0
    private misses = 0

    constructor(options: TtsDiskCacheOptions) {
        this.cacheDir = path.resolve(options.cacheDir)
        this.maxAgeDays = options.maxAgeDays ?? 30
        fs.mkdirSync(this.cacheDir, { recursive: true })
    }

    private hashKey(text: string, voice: string): string {
        return createHash('sha256').update(`${voice}:${text}`).digest('hex')
    }

    private filePath(hash: string): string {
        return path.join(this.cacheDir, `${hash}.opus`)
    }

    lookup(text: string, voice: string): Buffer | null {
        const hash = this.hashKey(text, voice)
        const fp = this.filePath(hash)

        try {
            if (fs.existsSync(fp)) {
                this.hits++
                console.log(`[TtsDiskCache] HIT (hash=${hash.slice(0, 12)}…, hits=${this.hits})`)
                return fs.readFileSync(fp)
            }
        } catch (error) {
            console.warn('[TtsDiskCache] lookup error:', error)
        }

        this.misses++
        return null
    }

    store(text: string, voice: string, audioBuffer: Buffer): void {
        const hash = this.hashKey(text, voice)
        const fp = this.filePath(hash)

        try {
            fs.writeFileSync(fp, audioBuffer)
            console.log(
                `[TtsDiskCache] STORED (hash=${hash.slice(0, 12)}…, size=${(audioBuffer.length / 1024).toFixed(1)}KB)`
            )
        } catch (error) {
            console.warn('[TtsDiskCache] store error:', error)
        }
    }

    prune(): number {
        const cutoff = Date.now() - this.maxAgeDays * 24 * 60 * 60 * 1000
        let pruned = 0

        try {
            const files = fs.readdirSync(this.cacheDir).filter((f) => f.endsWith('.opus'))
            for (const file of files) {
                const fp = path.join(this.cacheDir, file)
                const stat = fs.statSync(fp)
                if (stat.mtimeMs < cutoff) {
                    fs.unlinkSync(fp)
                    pruned++
                }
            }
            if (pruned > 0) {
                console.log(`[TtsDiskCache] PRUNED ${pruned} expired files`)
            }
        } catch (error) {
            console.warn('[TtsDiskCache] prune error:', error)
        }

        return pruned
    }

    stats(): TtsCacheStats {
        try {
            const files = fs.readdirSync(this.cacheDir).filter((f) => f.endsWith('.opus'))
            let totalSize = 0
            for (const file of files) {
                const stat = fs.statSync(path.join(this.cacheDir, file))
                totalSize += stat.size
            }
            return {
                fileCount: files.length,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            }
        } catch {
            return { fileCount: 0, totalSizeBytes: 0, totalSizeMB: '0.00' }
        }
    }

    cacheHitRate(): { hits: number; misses: number; rate: number } {
        const total = this.hits + this.misses
        return {
            hits: this.hits,
            misses: this.misses,
            rate: total > 0 ? this.hits / total : 0,
        }
    }
}
