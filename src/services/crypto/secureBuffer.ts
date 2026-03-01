/**
 * SecureBuffer — Auto-zeroing wrapper for sensitive cryptographic data.
 *
 * Aligned with LOCKVAULT Pilar III (RAM Hygiene):
 * Decrypted data exists in RAM only for the millisecond it's used,
 * then gets overwritten with random bytes before GC can touch it.
 */

export class SecureBuffer {
    private buffer: Uint8Array
    private disposed = false

    constructor(data: Uint8Array | ArrayBuffer | number) {
        if (typeof data === 'number') {
            this.buffer = new Uint8Array(data)
        } else if (data instanceof ArrayBuffer) {
            this.buffer = new Uint8Array(data)
        } else {
            this.buffer = new Uint8Array(data)
        }
    }

    get view(): Uint8Array {
        this.assertNotDisposed()
        return this.buffer
    }

    get length(): number {
        return this.buffer.byteLength
    }

    get isDisposed(): boolean {
        return this.disposed
    }

    /**
     * Overwrite buffer with cryptographically random bytes, then zero it.
     * Double-pass: random overwrite defeats cold-boot attacks,
     * zero pass ensures no residual patterns.
     */
    dispose(): void {
        if (this.disposed) return

        // Pass 1: random overwrite
        crypto.getRandomValues(this.buffer)
        // Pass 2: zero fill
        this.buffer.fill(0)

        this.disposed = true
    }

    /**
     * Copy contents to a new standard Uint8Array.
     * The caller owns the copy — SecureBuffer still owns the original.
     */
    toUint8Array(): Uint8Array {
        this.assertNotDisposed()
        return new Uint8Array(this.buffer)
    }

    /**
     * Copy contents to a new ArrayBuffer.
     */
    toArrayBuffer(): ArrayBuffer {
        this.assertNotDisposed()
        return (this.buffer.buffer as ArrayBuffer).slice(
            this.buffer.byteOffset,
            this.buffer.byteOffset + this.buffer.byteLength,
        )
    }

    private assertNotDisposed(): void {
        if (this.disposed) {
            throw new Error('SecureBuffer: access after dispose — buffer has been zeroed')
        }
    }
}

/**
 * Execute `fn` with a SecureBuffer, auto-disposing after completion.
 * Works like a "using" pattern — guarantees zeroing even on error.
 *
 * @example
 * const result = await withSecureBuffer(decryptedBytes, (buf) => {
 *   return parseJSON(new TextDecoder().decode(buf.view))
 * })
 * // buf is zeroed here, even if parseJSON throws
 */
export async function withSecureBuffer<T>(
    data: Uint8Array | ArrayBuffer,
    fn: (buf: SecureBuffer) => T | Promise<T>,
): Promise<T> {
    const buf = new SecureBuffer(data)
    try {
        return await fn(buf)
    } finally {
        buf.dispose()
    }
}

/**
 * Synchronous variant of withSecureBuffer.
 */
export function withSecureBufferSync<T>(
    data: Uint8Array | ArrayBuffer,
    fn: (buf: SecureBuffer) => T,
): T {
    const buf = new SecureBuffer(data)
    try {
        return fn(buf)
    } finally {
        buf.dispose()
    }
}

/**
 * Zero-fill any Uint8Array in place. Use when you don't need
 * the full SecureBuffer wrapper but still want RAM hygiene.
 */
export function zeroize(buffer: Uint8Array): void {
    crypto.getRandomValues(buffer)
    buffer.fill(0)
}
