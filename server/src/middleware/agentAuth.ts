import type { Request, Response, NextFunction } from 'express'
import { env } from '../config.js'

/**
 * Middleware: validates x-agent-token header.
 * Only internal agents (Buggy/OpenClaw) can call /internal/* endpoints.
 */
export function agentAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers['x-agent-token']

    if (!token || token !== env.agentToken) {
        res.status(401).json({ error: 'Unauthorized: invalid agent token' })
        return
    }

    next()
}
