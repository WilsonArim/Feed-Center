import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Check, Rocket } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useModuleStore, ALL_MODULES, MODULE_META, type ModuleId } from '@/stores/moduleStore'
import { StardustButton } from '@/components/ui/StardustButton'

type Step = 'hello' | 'modules' | 'try' | 'ready'

const STEP_INDEX: Record<Step, number> = { hello: 0, modules: 1, try: 2, ready: 3 }

const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
}

export function OnboardingModal() {
    const { txt } = useLocaleText()
    const { setActiveModules, completeOnboarding, onboardingCompleted } = useModuleStore()
    const [step, setStep] = useState<Step>('hello')
    const [selected, setSelected] = useState<Set<ModuleId>>(new Set(ALL_MODULES))

    // Step 1: auto-advance after 3s
    useEffect(() => {
        if (step !== 'hello') return
        const timer = setTimeout(() => setStep('modules'), 3000)
        return () => clearTimeout(timer)
    }, [step])

    const toggleModule = useCallback((id: ModuleId) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                if (next.size <= 1) return prev
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const handleFinish = useCallback(() => {
        setActiveModules(Array.from(selected))
        completeOnboarding()
    }, [selected, setActiveModules, completeOnboarding])

    if (onboardingCompleted) return null

    const progress = ((STEP_INDEX[step] + 1) / 4) * 100

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 backdrop-blur-xl"
            >
                <motion.div
                    initial={{ scale: 0.92, y: 24, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.92, y: 24, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 220, delay: 0.1 }}
                    className="relative w-full max-w-xl mx-4 overflow-hidden rounded-2xl
                        bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                        shadow-[0_32px_100px_rgba(0,0,0,0.6)]"
                >
                    {/* Progress bar */}
                    <div className="h-1 bg-[var(--bg-inset)]">
                        <motion.div
                            className="h-full bg-[var(--accent)]"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    <div className="p-8 md:p-10">
                        <AnimatePresence mode="wait">
                            {/* ── Step 1: Hello Buggy ── */}
                            {step === 'hello' && (
                                <motion.div
                                    key="hello"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    className="flex flex-col items-center text-center gap-5"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
                                        className="text-6xl"
                                    >
                                        <Sparkles size={56} className="text-[var(--accent)] drop-shadow-[0_0_20px_rgba(255,90,0,0.4)]" />
                                    </motion.div>

                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                                        {txt('Olá, sou o Buggy', 'Hi, I\'m Buggy')}
                                    </h2>

                                    <p className="text-[var(--text-secondary)] leading-relaxed max-w-sm">
                                        {txt(
                                            'O teu assistente cognitivo pessoal. Vou ajudar-te a gerir tudo.',
                                            'Your personal cognitive assistant. I\'ll help you manage everything.'
                                        )}
                                    </p>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                        className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                        {txt('A avançar automaticamente...', 'Auto-advancing...')}
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* ── Step 2: Module Selection ── */}
                            {step === 'modules' && (
                                <motion.div
                                    key="modules"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    className="space-y-5"
                                >
                                    <div className="text-center">
                                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                                            {txt('O que queres gerir?', 'What do you want to manage?')}
                                        </h2>
                                        <p className="text-sm text-[var(--text-tertiary)] mt-2">
                                            {txt('Toca para ativar ou desativar. Minimo 1.', 'Tap to toggle. Minimum 1.')}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {ALL_MODULES.map((id) => {
                                            const meta = MODULE_META[id]
                                            const isSelected = selected.has(id)
                                            return (
                                                <motion.button
                                                    key={id}
                                                    onClick={() => toggleModule(id)}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                                                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_20px_rgba(255,90,0,0.15)]'
                                                        : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:border-[var(--border-default)]'
                                                    }`}
                                                >
                                                    <span className="text-3xl">{meta.icon}</span>
                                                    <span className="font-bold text-sm text-[var(--text-primary)]">
                                                        {txt(meta.labelPt, meta.labelEn)}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-tertiary)] leading-snug line-clamp-2 text-center">
                                                        {txt(meta.descPt, meta.descEn)}
                                                    </span>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center"
                                                        >
                                                            <Check size={12} className="text-white" />
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            )
                                        })}
                                    </div>

                                    <div className="flex justify-center pt-2">
                                        <StardustButton onClick={() => setStep('try')}>
                                            {txt('Continuar', 'Continue')}
                                            <ArrowRight size={16} />
                                        </StardustButton>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 3: Try Talking ── */}
                            {step === 'try' && (
                                <TryStep
                                    onNext={() => setStep('ready')}
                                    onSkip={() => setStep('ready')}
                                />
                            )}

                            {/* ── Step 4: Ready ── */}
                            {step === 'ready' && (
                                <motion.div
                                    key="ready"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    className="flex flex-col items-center text-center gap-5"
                                >
                                    {/* Celebration burst */}
                                    <div className="relative">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -15 }}
                                            animate={{ scale: [0, 1.2, 1], rotate: [0, 15, -10, 0] }}
                                            transition={{ type: 'spring', damping: 10, stiffness: 150 }}
                                        >
                                            <Rocket size={56} className="text-[var(--accent)] drop-shadow-[0_0_24px_rgba(255,90,0,0.5)]" />
                                        </motion.div>
                                        {/* Particles */}
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-2 h-2 rounded-full bg-[var(--accent)]"
                                                style={{ top: '50%', left: '50%' }}
                                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                                animate={{
                                                    x: Math.cos((i / 6) * Math.PI * 2) * 60,
                                                    y: Math.sin((i / 6) * Math.PI * 2) * 60,
                                                    opacity: [1, 0],
                                                    scale: [1, 0.3],
                                                }}
                                                transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                                            />
                                        ))}
                                    </div>

                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                                        {txt('Estamos prontos!', 'We\'re ready!')}
                                    </h2>

                                    <p className="text-[var(--text-secondary)] leading-relaxed max-w-sm">
                                        {txt(
                                            `Ativaste ${selected.size} módulo${selected.size > 1 ? 's' : ''}. O Buggy está ao teu lado.`,
                                            `You activated ${selected.size} module${selected.size > 1 ? 's' : ''}. Buggy is by your side.`
                                        )}
                                    </p>

                                    <StardustButton onClick={handleFinish}>
                                        <Sparkles size={16} />
                                        {txt('Começar', 'Get started')}
                                    </StardustButton>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

/* ── Step 3 sub-component: simulated Buggy conversation ── */
function TryStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
    const { txt } = useLocaleText()
    const [input, setInput] = useState('')
    const [sent, setSent] = useState(false)
    const [response, setResponse] = useState('')

    const handleSend = useCallback(() => {
        if (!input.trim()) return
        setSent(true)
        // Simulate Buggy processing
        const timer = setTimeout(() => {
            setResponse(
                txt(
                    `Percebi! "${input.trim()}" — vou tratar disso. Isto é o tipo de coisa que faço automaticamente.`,
                    `Got it! "${input.trim()}" — I'll handle that. This is the kind of thing I do automatically.`
                )
            )
        }, 1200)
        return () => clearTimeout(timer)
    }, [input, txt])

    return (
        <motion.div
            key="try"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-5"
        >
            <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    {txt('Experimenta falar comigo', 'Try talking to me')}
                </h2>
                <p className="text-sm text-[var(--text-tertiary)] mt-2 max-w-sm mx-auto">
                    {txt(
                        'Escreve algo como "Gastei 5€ no café" ou "Lembrar de ligar ao João".',
                        'Type something like "Spent $5 on coffee" or "Remind me to call John".'
                    )}
                </p>
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={sent}
                    placeholder={txt('Escreve algo ao Buggy...', 'Type something to Buggy...')}
                    className="w-full px-5 py-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]
                        text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)]
                        focus:outline-none focus:border-[var(--accent)]/50 focus:shadow-[0_0_20px_rgba(255,90,0,0.1)]
                        transition-all disabled:opacity-60"
                    autoFocus
                />
                {!sent && input.trim() && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={handleSend}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                            bg-[var(--accent)] flex items-center justify-center cursor-pointer
                            hover:brightness-110 transition-all"
                    >
                        <ArrowRight size={14} className="text-white" />
                    </motion.button>
                )}
            </div>

            {/* Simulated response */}
            <AnimatePresence>
                {sent && !response && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--accent)]/8 border border-[var(--accent)]/20"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <Sparkles size={16} className="text-[var(--accent)]" />
                        </motion.div>
                        <span className="text-sm text-[var(--text-secondary)]">
                            {txt('A processar...', 'Processing...')}
                        </span>
                    </motion.div>
                )}

                {response && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-5 py-4 rounded-2xl bg-[var(--accent)]/8 border border-[var(--accent)]/20"
                    >
                        <div className="flex items-start gap-3">
                            <Sparkles size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{response}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-3 pt-2">
                {!response ? (
                    <button
                        onClick={onSkip}
                        className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                        {txt('Saltar este passo', 'Skip this step')}
                    </button>
                ) : (
                    <StardustButton onClick={onNext}>
                        {txt('Continuar', 'Continue')}
                        <ArrowRight size={16} />
                    </StardustButton>
                )}
            </div>
        </motion.div>
    )
}
