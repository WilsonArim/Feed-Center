/**
 * DeviceSettings — Manage authorized WebAuthn devices.
 *
 * Features:
 *   - List all registered device credentials from Supabase
 *   - Revoke a device (DELETE credential)
 *   - Add a new device (launches WebAuthn warm-up inline)
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Monitor, Smartphone, Fingerprint, KeyRound, Trash2,
    Plus, Shield, Loader2, AlertTriangle, Check, RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { supabase } from '@/lib/supabase'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLocaleText } from '@/i18n/useLocaleText'

// ── Types ──────────────────────────────────────────────────────────

interface DeviceCredential {
    id: string
    credential_id: string
    derivation_method: 'prf' | 'pbkdf2'
    created_at: string
    last_used_at: string | null
    transports: string[]
}

type AddDeviceStep = 'idle' | 'warmup' | 'pending' | 'done' | 'error'

// ── Helpers ────────────────────────────────────────────────────────

function deviceIcon(transports: string[], method: 'prf' | 'pbkdf2') {
    if (method === 'pbkdf2') return <Shield size={16} className="text-[var(--color-text-muted)]" />
    if (transports.includes('internal')) return <Fingerprint size={16} className="text-[var(--color-accent)]" />
    if (transports.includes('hybrid')) return <Smartphone size={16} className="text-[var(--color-accent)]" />
    return <Monitor size={16} className="text-[var(--color-accent)]" />
}

function deviceLabel(transports: string[], method: 'prf' | 'pbkdf2', txt: (pt: string, en: string) => string) {
    if (method === 'pbkdf2') return txt('Frase de recuperação', 'Recovery phrase')
    if (transports.includes('internal')) return txt('Este dispositivo (biometria)', 'This device (biometrics)')
    if (transports.includes('hybrid')) return txt('Telemóvel (cross-device)', 'Phone (cross-device)')
    return txt('Dispositivo externo', 'External device')
}

function formatDate(iso: string | null, txt: (pt: string, en: string) => string) {
    if (!iso) return txt('Nunca usado', 'Never used')
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Main Component ─────────────────────────────────────────────────

export function DeviceSettings() {
    const { txt } = useLocaleText()
    const { user, session } = useAuth()

    const [devices, setDevices] = useState<DeviceCredential[]>([])
    const [loadingList, setLoadingList] = useState(true)
    const [revoking, setRevoking] = useState<string | null>(null)   // credential row id
    const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null)
    const [addStep, setAddStep] = useState<AddDeviceStep>('idle')

    // ── Fetch device list ──────────────────────────────────────────

    const fetchDevices = useCallback(async () => {
        if (!user) return
        setLoadingList(true)
        const { data, error } = await supabase
            .from('webauthn_credentials')
            .select('id, credential_id, derivation_method, created_at, last_used_at, transports')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!error) setDevices((data as DeviceCredential[]) ?? [])
        setLoadingList(false)
    }, [user])

    useEffect(() => { void fetchDevices() }, [fetchDevices])

    // ── Revoke ─────────────────────────────────────────────────────

    const handleRevoke = useCallback(async (rowId: string) => {
        setRevoking(rowId)
        const token = session?.access_token
        if (!token) { setRevoking(null); return }

        try {
            const res = await fetch(`/api/auth/credentials/${rowId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setDevices(prev => prev.filter(d => d.id !== rowId))
            }
        } finally {
            setRevoking(null)
            setRevokeConfirm(null)
        }
    }, [session])

    // ── Add device ─────────────────────────────────────────────────

    const handleAddDevice = useCallback(async () => {
        setAddStep('pending')
        const token = session?.access_token
        if (!token || !user) { setAddStep('error'); return }

        try {
            // 1. Get challenge from server
            const challengeRes = await fetch('/api/auth/registration/challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!challengeRes.ok) throw new Error('Challenge failed')
            const { challenge, excludeCredentials } = await challengeRes.json()

            // 2. Call WebAuthn
            const cred = await navigator.credentials.create({
                publicKey: {
                    rp: { id: location.hostname, name: 'Feed Center' },
                    user: {
                        id: new TextEncoder().encode(user.id),
                        name: user.email ?? user.id,
                        displayName: user.email ?? user.id,
                    },
                    challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required',
                        residentKey: 'required',
                    },
                    timeout: 60_000,
                    excludeCredentials,
                },
            }) as PublicKeyCredential | null

            if (!cred) { setAddStep('error'); return }

            // 3. Verify with server
            const response = cred.response as AuthenticatorAttestationResponse
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))

            const verifyRes = await fetch('/api/auth/registration/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    credentialId,
                    transports: response.getTransports?.() ?? [],
                    derivationMethod: 'prf',
                    salt: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),
                    publicKeySpki: btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey?.() ?? new ArrayBuffer(0)))),
                }),
            })

            if (verifyRes.ok) {
                setAddStep('done')
                setTimeout(() => { setAddStep('idle'); void fetchDevices() }, 1500)
            } else {
                setAddStep('error')
            }
        } catch {
            setAddStep('error')
        }
    }, [session, user, fetchDevices])

    // ── Render ─────────────────────────────────────────────────────

    return (
        <section className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                        {txt('Dispositivos Autorizados', 'Authorized Devices')}
                    </h2>
                    <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">
                        {txt(
                            'Cada dispositivo tem a sua própria chave criptográfica.',
                            'Each device has its own cryptographic key.',
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchDevices}
                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                    aria-label={txt('Atualizar', 'Refresh')}
                >
                    <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Device list */}
            <div className="flex flex-col gap-2">
                {loadingList ? (
                    <div className="flex items-center justify-center py-8 text-[var(--color-text-muted)]">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : devices.length === 0 ? (
                    <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
                        {txt('Nenhum dispositivo encontrado.', 'No devices found.')}
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {devices.map((device, i) => (
                            <motion.div
                                key={device.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20, height: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] group"
                            >
                                {/* Icon */}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-bg-tertiary)] shrink-0">
                                    {deviceIcon(device.transports, device.derivation_method)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                        {deviceLabel(device.transports, device.derivation_method, txt)}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                        {txt('Adicionado', 'Added')} {formatDate(device.created_at, txt)}
                                        {device.last_used_at && (
                                            <> · {txt('Usado', 'Used')} {formatDate(device.last_used_at, txt)}</>
                                        )}
                                    </p>
                                </div>

                                {/* Revoke */}
                                {revokeConfirm === device.id ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleRevoke(device.id)}
                                            disabled={revoking === device.id}
                                            className="text-xs font-semibold text-[var(--color-danger)] hover:underline cursor-pointer disabled:opacity-50"
                                        >
                                            {revoking === device.id
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : txt('Confirmar', 'Confirm')
                                            }
                                        </button>
                                        <span className="text-[var(--color-border)]">·</span>
                                        <button
                                            onClick={() => setRevokeConfirm(null)}
                                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                                        >
                                            {txt('Cancelar', 'Cancel')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRevokeConfirm(device.id)}
                                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                        aria-label={txt('Revogar acesso', 'Revoke access')}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Add new device */}
            <div className="rounded-2xl border border-[var(--color-border)] border-dashed overflow-hidden">
                <AnimatePresence mode="wait">
                    {addStep === 'idle' && (
                        <motion.button
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAddStep('warmup')}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                        >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-accent)]/10 shrink-0">
                                <Plus size={16} className="text-[var(--color-accent)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--color-accent)]">
                                    {txt('Adicionar Novo Dispositivo', 'Add New Device')}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {txt(
                                        'Autorize este navegador ou telemóvel',
                                        'Authorize this browser or phone',
                                    )}
                                </p>
                            </div>
                        </motion.button>
                    )}

                    {/* Mini warm-up for add flow */}
                    {addStep === 'warmup' && (
                        <motion.div
                            key="warmup"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="px-4 py-5 flex flex-col gap-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-accent)]/10 shrink-0 mt-0.5">
                                    <KeyRound size={16} className="text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                        {txt('Registar novo dispositivo', 'Register new device')}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                                        {txt(
                                            'O sistema vai pedir a tua biometria ou PIN para criar uma nova chave. Num computador, podes usar o PIN do sistema ou o teu telemóvel.',
                                            'The system will ask for your biometrics or PIN to create a new key. On a desktop, you can use your system PIN or phone.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <StardustButton
                                    id="add-device-confirm"
                                    size="sm"
                                    icon={<Fingerprint size={14} />}
                                    onClick={handleAddDevice}
                                >
                                    {txt('Criar Chave Segura', 'Create Secure Key')}
                                </StardustButton>
                                <StardustButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddStep('idle')}
                                >
                                    {txt('Cancelar', 'Cancel')}
                                </StardustButton>
                            </div>
                        </motion.div>
                    )}

                    {addStep === 'pending' && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 px-4 py-3.5 text-[var(--color-text-muted)]"
                        >
                            <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
                            <p className="text-sm">
                                {txt('A aguardar autorização…', 'Waiting for authorization…')}
                            </p>
                        </motion.div>
                    )}

                    {addStep === 'done' && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 px-4 py-3.5 text-[var(--color-success)]"
                        >
                            <Check size={16} />
                            <p className="text-sm font-medium">
                                {txt('Dispositivo adicionado!', 'Device added!')}
                            </p>
                        </motion.div>
                    )}

                    {addStep === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between gap-3 px-4 py-3.5"
                        >
                            <div className="flex items-center gap-2 text-[var(--color-danger)]">
                                <AlertTriangle size={15} />
                                <p className="text-sm">
                                    {txt('Falhou. Tenta novamente.', 'Failed. Please try again.')}
                                </p>
                            </div>
                            <button
                                onClick={() => setAddStep('idle')}
                                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                            >
                                {txt('Fechar', 'Close')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Security note */}
            <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                <Shield size={12} className="mt-0.5 shrink-0" />
                {txt(
                    'Revogar um dispositivo impede-o de aceder ao teu vault, mesmo que o aparelho seja roubado.',
                    'Revoking a device prevents it from accessing your vault, even if the device is stolen.',
                )}
            </p>
        </section>
    )
}
