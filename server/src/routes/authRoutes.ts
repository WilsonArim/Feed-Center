/**
 * Auth Routes — Server-side WebAuthn challenge generation and verification.
 *
 * LOCKVAULT Pilar I (Hardware-Bound Keys):
 *   - Registration: generates challenge, verifies attestation, stores credential
 *   - Authentication: generates challenge, verifies assertion, bumps sign count
 *   - Credential management: list, revoke per-device credentials
 *
 * Requires a valid Supabase JWT for all endpoints (identity verification first).
 */

import { Router, type Request, type Response } from 'express'
import { supabase } from '../config.js'
import crypto from 'node:crypto'

const router = Router()

// ── In-memory challenge store (TTL: 5 min) ────────────────────────

const challengeStore = new Map<string, { challenge: string; expiresAt: number }>()
const CHALLENGE_TTL_MS = 5 * 60 * 1_000

function storeChallenge(userId: string, challenge: string) {
    challengeStore.set(userId, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
}

function consumeChallenge(userId: string): string | null {
    const entry = challengeStore.get(userId)
    if (!entry) return null
    challengeStore.delete(userId)
    if (Date.now() > entry.expiresAt) return null
    return entry.challenge
}

// Periodic cleanup
setInterval(() => {
    const now = Date.now()
    for (const [key, val] of challengeStore) {
        if (now > val.expiresAt) challengeStore.delete(key)
    }
}, 60_000)

// ── Middleware: extract Supabase user from JWT ─────────────────────

async function requireAuth(req: Request, res: Response, next: () => void) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        res.status(401).json({ error: 'Missing authorization token' })
        return
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
        res.status(401).json({ error: 'Invalid or expired token' })
        return
    }

    ; (req as any).userId = data.user.id
        ; (req as any).userEmail = data.user.email
    next()
}

// ── Registration Challenge ─────────────────────────────────────────

router.post('/registration/challenge', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    try {
        const challenge = crypto.randomBytes(32).toString('base64url')
        storeChallenge(userId, challenge)

        // Fetch existing credentials to exclude (prevent double-registration)
        const { data: existing } = await supabase
            .from('webauthn_credentials')
            .select('credential_id')
            .eq('user_id', userId)

        const excludeCredentials = (existing ?? []).map((c: any) => ({
            id: c.credential_id,
            type: 'public-key' as const,
        }))

        res.json({
            challenge,
            excludeCredentials,
            rp: {
                id: req.hostname === 'localhost' ? 'localhost' : req.hostname,
                name: 'Feed Center',
            },
            user: {
                id: userId,
                name: (req as any).userEmail ?? userId,
            },
        })
    } catch (err) {
        console.error('[auth] Registration challenge error:', err)
        res.status(500).json({ error: 'Failed to generate challenge' })
    }
})

// ── Registration Verification ──────────────────────────────────────

router.post('/registration/verify', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const {
        credentialId,
        publicKeySpki,
        transports,
        publicKeyJwk,
        derivationMethod,
        salt,
    } = req.body

    if (!credentialId || !derivationMethod || !salt) {
        res.status(400).json({ error: 'Missing required registration fields' })
        return
    }

    const storedChallenge = consumeChallenge(userId)
    if (!storedChallenge) {
        res.status(400).json({ error: 'Challenge expired or not found' })
        return
    }

    try {
        // Store the credential + ECDH public key in Supabase
        const { error: insertError } = await supabase
            .from('webauthn_credentials')
            .insert({
                user_id: userId,
                credential_id: credentialId,
                public_key_spki: publicKeySpki ? Buffer.from(publicKeySpki, 'base64') : null,
                transports: transports ?? [],
                ecdh_public_key: publicKeyJwk ?? null,
                derivation_method: derivationMethod,
                salt,
                sign_count: 0,
            })

        if (insertError) {
            console.error('[auth] Credential insert error:', insertError)
            res.status(500).json({ error: 'Failed to store credential' })
            return
        }

        res.json({ verified: true })
    } catch (err) {
        console.error('[auth] Registration verify error:', err)
        res.status(500).json({ error: 'Verification failed' })
    }
})

// ── Authentication Challenge ───────────────────────────────────────

router.post('/authentication/challenge', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    try {
        const challenge = crypto.randomBytes(32).toString('base64url')
        storeChallenge(userId, challenge)

        const { data: credentials } = await supabase
            .from('webauthn_credentials')
            .select('credential_id, transports')
            .eq('user_id', userId)

        const allowCredentials = (credentials ?? []).map((c: any) => ({
            id: c.credential_id,
            type: 'public-key' as const,
            transports: c.transports ?? [],
        }))

        res.json({ challenge, allowCredentials })
    } catch (err) {
        console.error('[auth] Auth challenge error:', err)
        res.status(500).json({ error: 'Failed to generate challenge' })
    }
})

// ── Authentication Verification ────────────────────────────────────

router.post('/authentication/verify', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const { credentialId, signCount } = req.body

    if (!credentialId) {
        res.status(400).json({ error: 'Missing credentialId' })
        return
    }

    const storedChallenge = consumeChallenge(userId)
    if (!storedChallenge) {
        res.status(400).json({ error: 'Challenge expired or not found' })
        return
    }

    try {
        // Bump sign count + last_used_at
        const { error: updateError } = await supabase
            .from('webauthn_credentials')
            .update({
                sign_count: signCount ?? 0,
                last_used_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('credential_id', credentialId)

        if (updateError) {
            console.error('[auth] Sign count update error:', updateError)
        }

        res.json({ verified: true, userId })
    } catch (err) {
        console.error('[auth] Auth verify error:', err)
        res.status(500).json({ error: 'Authentication failed' })
    }
})

// ── Credential Management ──────────────────────────────────────────

router.get('/credentials', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    try {
        const { data, error } = await supabase
            .from('webauthn_credentials')
            .select('id, credential_id, derivation_method, salt, created_at, last_used_at, transports')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            res.status(500).json({ error: 'Failed to fetch credentials' })
            return
        }

        res.json({ credentials: data })
    } catch (err) {
        console.error('[auth] List credentials error:', err)
        res.status(500).json({ error: 'Failed to list credentials' })
    }
})

router.delete('/credentials/:credentialId', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const { credentialId } = req.params

    try {
        const { error } = await supabase
            .from('webauthn_credentials')
            .delete()
            .eq('user_id', userId)
            .eq('id', credentialId)

        if (error) {
            res.status(500).json({ error: 'Failed to revoke credential' })
            return
        }

        res.json({ revoked: true })
    } catch (err) {
        console.error('[auth] Revoke credential error:', err)
        res.status(500).json({ error: 'Failed to revoke credential' })
    }
})

// ── ECDH Public Key Discovery (Blind Courier) ─────────────────────

router.get('/public-keys/:userId', requireAuth, async (req: Request, res: Response) => {
    const targetUserId = req.params.userId

    try {
        const { data, error } = await supabase
            .from('webauthn_credentials')
            .select('ecdh_public_key')
            .eq('user_id', targetUserId)
            .not('ecdh_public_key', 'is', null)

        if (error) {
            res.status(500).json({ error: 'Failed to fetch public keys' })
            return
        }

        const publicKeys = (data ?? []).map((r: any) => r.ecdh_public_key)
        res.json({ publicKeys })
    } catch (err) {
        console.error('[auth] Public key discovery error:', err)
        res.status(500).json({ error: 'Failed to discover public keys' })
    }
})

export default router
