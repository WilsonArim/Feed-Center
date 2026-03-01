export const LOCAL_VECTOR_DIMENSION = 192

function fnv1aHash(value: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i)
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return hash >>> 0
}

function tokenize(text: string): string[] {
    const tokens = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(/[a-z0-9€$]+/g)

    return tokens ?? []
}

function l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0))
    if (norm === 0) return vector
    return vector.map((value) => value / norm)
}

export function embedTextLocally(text: string, dimension: number = LOCAL_VECTOR_DIMENSION): number[] {
    const vector = new Array<number>(dimension).fill(0)
    const tokens = tokenize(text)

    for (const token of tokens) {
        const hash = fnv1aHash(token)
        const index = hash % dimension
        const sign = (hash & 1) === 0 ? 1 : -1
        const weight = 1 + Math.log1p(token.length)
        vector[index] += sign * weight

        if (/^\d+([.,]\d+)?$/.test(token)) {
            const amountWeight = 1.25
            const amountIndex = (hash >>> 8) % dimension
            vector[amountIndex] += sign * amountWeight
        }
    }

    for (let i = 0; i < tokens.length - 1; i++) {
        const biGram = `${tokens[i]}_${tokens[i + 1]}`
        const hash = fnv1aHash(biGram)
        const index = hash % dimension
        vector[index] += 0.7
    }

    return l2Normalize(vector)
}
