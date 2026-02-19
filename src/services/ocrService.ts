
export interface OCRAmount {
    amount: number
    currency: string
}

export interface OCRResult {
    merchant: string | null
    date: string | null
    total: OCRAmount | null
    items: string[]
    confidence: number
}

// Simulated delay for "AI Processing"
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const ocrService = {
    /**
     * Uploads image to Supabase Storage and triggers Google Vision (via Edge Function).
     * For MVP/Dev, it simulates the response.
     */
    async scanReceipt(file: File): Promise<OCRResult> {
        console.log('📷 Uploading receipt/document...', file.name, file.type)

        // 1. Upload to Supabase Storage (real)
        // const { data, error } = await supabase.storage.from('receipts').upload(...)
        // if (error) throw error

        // 2. Simulate AI Processing
        await sleep(2500)

        // 3. Return Mock Data (Simulating Intelligence)
        // Randomize slightly for demo feel
        const merchants = ['Pingo Doce', 'Continente', 'Mercadona', 'Uber Eats', 'Galp']
        const merchant = merchants[Math.floor(Math.random() * merchants.length)]

        const total = (Math.random() * 100 + 5).toFixed(2)

        // Date: Random day in current month
        const d = new Date()
        d.setDate(d.getDate() - Math.floor(Math.random() * 5))
        const dateStr = d.toISOString().split('T')[0]

        return {
            merchant: merchant ?? null,
            date: dateStr ?? null,
            total: {
                amount: parseFloat(total),
                currency: 'EUR'
            },
            items: ['Item detectado pela IA', 'Outro produto Scan'],
            confidence: 0.98
        }
    }
}
