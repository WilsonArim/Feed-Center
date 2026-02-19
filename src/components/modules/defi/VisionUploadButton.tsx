import { useRef, useState } from 'react'
import { Camera, Loader2, Check, AlertCircle } from 'lucide-react'
import { extractTextFromImage, isVisionAvailable } from '@/services/visionOcrService'
import type { VisionOcrResult } from '@/types'

interface Props {
    onResult: (result: VisionOcrResult) => void
    label?: string
}

export function VisionUploadButton({ onResult, label = 'Importar screenshot' }: Props) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
    const [error, setError] = useState('')

    if (!isVisionAvailable()) return null

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setStatus('processing')
        setError('')

        try {
            const result = await extractTextFromImage(file)
            setStatus('done')
            onResult(result)
            setTimeout(() => setStatus('idle'), 2000)
        } catch (err) {
            setStatus('error')
            setError(err instanceof Error ? err.message : 'Erro ao processar imagem')
            setTimeout(() => setStatus('idle'), 3000)
        }

        // Reset input
        if (fileRef.current) fileRef.current.value = ''
    }

    return (
        <div>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={status === 'processing'}
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--btn-radius)] text-xs font-medium
                    transition-all cursor-pointer disabled:opacity-50
                    ${status === 'done'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : status === 'error'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-[var(--color-text-secondary)] border border-white/10 hover:bg-white/10'
                    }`}
            >
                {status === 'processing' && <Loader2 size={14} className="animate-spin" />}
                {status === 'done' && <Check size={14} />}
                {status === 'error' && <AlertCircle size={14} />}
                {status === 'idle' && <Camera size={14} />}
                {status === 'processing' ? 'A processar...' : status === 'done' ? 'Importado!' : label}
            </button>
            {status === 'error' && error && (
                <p className="text-[10px] text-red-400 mt-1">{error}</p>
            )}
        </div>
    )
}
