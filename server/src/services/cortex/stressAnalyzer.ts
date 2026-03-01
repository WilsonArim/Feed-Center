/**
 * Stress Analyzer — Deckard Empathy Engine
 *
 * Detects "Metadados de Stress" in user input:
 *   - URGENCY: temporal pressure, deadline language
 *   - FATIGUE: short messages, low effort, monotone patterns
 *   - FRUSTRATION: negative sentiment, exclamation overuse, complaints
 *   - OVERWHELM: volume indicators, task accumulation signals
 *
 * The output is a StressProfile that feeds into:
 *   1. AdaptivePrompt (tone calibration)
 *   2. CortexRouter (autonomous governance decisions)
 *
 * Paradigm 2035: The system PROTECTS the user from cognitive overload.
 */

// ── Types ──────────────────────────────────────────────────────────

export type StressLevel = 'calm' | 'mild' | 'elevated' | 'high' | 'critical'
export type StressDimension = 'urgency' | 'fatigue' | 'frustration' | 'overwhelm'

export interface StressProfile {
    overall: StressLevel
    dimensions: Record<StressDimension, number>  // 0.0 – 1.0
    signals: string[]
    governance: GovernanceDirective
    timestamp: string
}

export interface GovernanceDirective {
    silenceNotifications: boolean
    postponeNonCritical: boolean
    useLowCognitiveLoad: boolean
    summarizeInstead: boolean
    maxResponseLength: 'brief' | 'normal' | 'detailed'
    tonePrescription: 'warm' | 'neutral' | 'clinical'
}

// ── Lexicons ───────────────────────────────────────────────────────

const URGENCY_MARKERS = [
    'urgente', 'urgent', 'agora', 'já', 'imediato', 'asap', 'rápido',
    'despacha', 'depressa', 'prazo', 'deadline', 'atrasado', 'atraso',
    'amanhã', 'hoje', 'ontem', 'esqueci', 'falta pouco', 'now',
    'hurry', 'rush', 'emergency', 'crítico', 'critical',
]

const FRUSTRATION_MARKERS = [
    'merda', 'foda', 'caralho', 'porra', 'raio', 'droga', 'bosta',
    'não funciona', 'outra vez', 'de novo', 'cansado', 'farto',
    'irritado', 'chateado', 'frustrado', 'wtf', 'fuck', 'shit',
    'damn', 'annoying', 'broken', 'useless', 'terrible', 'horrible',
    'porquê', 'why does', 'why is', 'sempre a mesma', 'nunca',
]

const FATIGUE_MARKERS = [
    'whatever', 'tanto faz', 'sei lá', 'não sei', 'qualquer',
    'meh', 'ok', 'tá', 'ya', 'hm', 'hmm', 'fine', 'k',
    'deixa', 'esquece', 'não importa', 'pronto',
]

const OVERWHELM_MARKERS = [
    'tudo', 'demais', 'muito', 'overwhelm', 'too much', 'caos',
    'não consigo', 'perdido', 'confuso', 'organizar', 'bagunça',
    'montanha', 'pilha', 'acumulado', 'stressed', 'stress',
    'ansiedade', 'anxiety', 'help', 'socorro', 'ajuda',
]

// ── Analysis Engine ────────────────────────────────────────────────

export class StressAnalyzer {

    analyze(rawText: string, recentHistory?: string[]): StressProfile {
        const text = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const signals: string[] = []

        // Score each dimension
        const urgency = this.scoreUrgency(text, rawText, signals)
        const frustration = this.scoreFrustration(text, rawText, signals)
        const fatigue = this.scoreFatigue(text, rawText, recentHistory, signals)
        const overwhelm = this.scoreOverwhelm(text, signals)

        const dimensions: Record<StressDimension, number> = {
            urgency,
            frustration,
            fatigue,
            overwhelm,
        }

        // Weighted composite
        const overall = this.computeOverall(dimensions)
        const governance = this.computeGovernance(overall, dimensions)

        return {
            overall,
            dimensions,
            signals,
            governance,
            timestamp: new Date().toISOString(),
        }
    }

    // ── Urgency ────────────────────────────────────────────────────

    private scoreUrgency(normalized: string, raw: string, signals: string[]): number {
        let score = 0

        // Lexicon match
        const hits = URGENCY_MARKERS.filter(m => normalized.includes(m))
        score += Math.min(0.6, hits.length * 0.15)
        if (hits.length > 0) signals.push(`urgency_words=[${hits.slice(0, 3).join(',')}]`)

        // Temporal markers (dates, times)
        if (/\d{1,2}[\/\-]\d{1,2}|\d{1,2}:\d{2}|amanha|hoje/.test(normalized)) {
            score += 0.15
            signals.push('urgency_temporal_marker')
        }

        // Exclamation intensity
        const exclamations = (raw.match(/!/g) || []).length
        if (exclamations >= 2) {
            score += Math.min(0.2, exclamations * 0.05)
            signals.push(`urgency_exclamations=${exclamations}`)
        }

        // ALL CAPS detection
        const capsRatio = (raw.match(/[A-Z]/g) || []).length / Math.max(1, raw.length)
        if (capsRatio > 0.5 && raw.length > 5) {
            score += 0.15
            signals.push('urgency_caps_shouting')
        }

        return Math.min(1, score)
    }

    // ── Frustration ────────────────────────────────────────────────

    private scoreFrustration(normalized: string, raw: string, signals: string[]): number {
        let score = 0

        const hits = FRUSTRATION_MARKERS.filter(m => normalized.includes(m))
        score += Math.min(0.7, hits.length * 0.2)
        if (hits.length > 0) signals.push(`frustration_words=[${hits.slice(0, 3).join(',')}]`)

        // Repeated punctuation (??? or !!!)
        if (/[?!]{3,}/.test(raw)) {
            score += 0.2
            signals.push('frustration_repeated_punctuation')
        }

        // Negative sentence patterns
        if (/nao (funciona|da|consigo|percebi)/i.test(normalized)) {
            score += 0.15
            signals.push('frustration_negative_pattern')
        }

        return Math.min(1, score)
    }

    // ── Fatigue ────────────────────────────────────────────────────

    private scoreFatigue(
        normalized: string,
        raw: string,
        recentHistory: string[] | undefined,
        signals: string[],
    ): number {
        let score = 0

        // Lexicon match
        const hits = FATIGUE_MARKERS.filter(m => normalized.includes(m))
        score += Math.min(0.5, hits.length * 0.15)
        if (hits.length > 0) signals.push(`fatigue_words=[${hits.slice(0, 3).join(',')}]`)

        // Very short message (< 5 words)
        const wordCount = raw.trim().split(/\s+/).length
        if (wordCount <= 3) {
            score += 0.2
            signals.push(`fatigue_terse_message_words=${wordCount}`)
        }

        // No capitalization effort (all lowercase, no punctuation)
        if (raw === raw.toLowerCase() && !/[.!?]/.test(raw) && raw.length > 10) {
            score += 0.1
            signals.push('fatigue_no_formatting_effort')
        }

        // Recent history pattern: declining message length
        if (recentHistory && recentHistory.length >= 3) {
            const lengths = recentHistory.slice(-5).map(m => m.length)
            const avgRecent = lengths.reduce((a, b) => a + b, 0) / lengths.length
            if (avgRecent < 20 && raw.length < 15) {
                score += 0.15
                signals.push('fatigue_declining_engagement')
            }
        }

        return Math.min(1, score)
    }

    // ── Overwhelm ──────────────────────────────────────────────────

    private scoreOverwhelm(normalized: string, signals: string[]): number {
        let score = 0

        const hits = OVERWHELM_MARKERS.filter(m => normalized.includes(m))
        score += Math.min(0.6, hits.length * 0.15)
        if (hits.length > 0) signals.push(`overwhelm_words=[${hits.slice(0, 3).join(',')}]`)

        // Long rambling messages (> 200 chars without structure)
        if (normalized.length > 200 && !/[.\n]/.test(normalized)) {
            score += 0.15
            signals.push('overwhelm_unstructured_ramble')
        }

        return Math.min(1, score)
    }

    // ── Composite & Governance ──────────────────────────────────────

    private computeOverall(dims: Record<StressDimension, number>): StressLevel {
        const weighted =
            dims.urgency * 0.25 +
            dims.frustration * 0.35 +
            dims.fatigue * 0.2 +
            dims.overwhelm * 0.2

        if (weighted >= 0.75) return 'critical'
        if (weighted >= 0.55) return 'high'
        if (weighted >= 0.35) return 'elevated'
        if (weighted >= 0.15) return 'mild'
        return 'calm'
    }

    private computeGovernance(level: StressLevel, dims: Record<StressDimension, number>): GovernanceDirective {
        switch (level) {
            case 'calm':
                return {
                    silenceNotifications: false,
                    postponeNonCritical: false,
                    useLowCognitiveLoad: false,
                    summarizeInstead: false,
                    maxResponseLength: 'normal',
                    tonePrescription: 'neutral',
                }
            case 'mild':
                return {
                    silenceNotifications: false,
                    postponeNonCritical: false,
                    useLowCognitiveLoad: false,
                    summarizeInstead: false,
                    maxResponseLength: 'normal',
                    tonePrescription: dims.frustration > 0.3 ? 'warm' : 'neutral',
                }
            case 'elevated':
                return {
                    silenceNotifications: false,
                    postponeNonCritical: true,
                    useLowCognitiveLoad: false,
                    summarizeInstead: dims.fatigue > 0.4,
                    maxResponseLength: 'brief',
                    tonePrescription: 'warm',
                }
            case 'high':
                return {
                    silenceNotifications: true,
                    postponeNonCritical: true,
                    useLowCognitiveLoad: true,
                    summarizeInstead: true,
                    maxResponseLength: 'brief',
                    tonePrescription: 'warm',
                }
            case 'critical':
                return {
                    silenceNotifications: true,
                    postponeNonCritical: true,
                    useLowCognitiveLoad: true,
                    summarizeInstead: true,
                    maxResponseLength: 'brief',
                    tonePrescription: 'clinical',
                }
        }
    }
}

export const stressAnalyzer = new StressAnalyzer()
