import { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { StardustButton } from '@/components/ui/StardustButton'

interface VoiceInputProps {
    onTranscript: (text: string) => void
    className?: string
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(true)
    const [recognition, setRecognition] = useState<any>(null)

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false)
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const rec = new SpeechRecognition()
        rec.continuous = false
        rec.interimResults = false
        rec.lang = 'pt-PT' // Default to Portuguese, could be prop

        rec.onstart = () => setIsListening(true)
        rec.onend = () => setIsListening(false)
        rec.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            onTranscript(transcript)
        }
        rec.onerror = (event: any) => {
            console.error('Speech recognition error', event.error)
            setIsListening(false)
        }

        setRecognition(rec)
    }, [onTranscript])

    const toggleListening = () => {
        if (!isSupported) return
        if (isListening) {
            recognition.stop()
        } else {
            recognition.start()
        }
    }

    if (!isSupported) return null

    return (
        <div className={className}>
            <StardustButton
                type="button"
                variant={isListening ? 'danger' : 'ghost'}
                size="sm"
                onClick={toggleListening}
                className={`relative overflow-hidden ${isListening ? 'animate-pulse' : ''}`}
                title="Input de Voz"
            >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}

                {/* Ripple Effect when listening */}
                {isListening && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-red-500/30"
                    />
                )}
            </StardustButton>
        </div>
    )
}
