/**
 * Turing-Sherlock Test Protocol — Direct Node Runner
 *
 * Bypasses the HTTP server and Redis workers entirely.
 * Tests the Cognitive Core (ActionExecutor + SherlockEngine) in isolation.
 *
 * Usage:
 *   cd server
 *   npx tsx test-cognitive-core.ts
 */

import 'dotenv/config'
import { cortexRouter } from './src/services/cortex/cortexRouter.js'

const USER_ID = '785ac334-e88e-4a7e-9a49-695d047a5e0e'

function separator(title: string) {
    console.log('\n' + '─'.repeat(60))
    console.log(`  ${title}`)
    console.log('─'.repeat(60))
}

function printResult(label: string, result: unknown) {
    console.log(`\n[${label}]`)
    console.log(JSON.stringify(result, null, 2))
}

// ── Step 0: Seed biographical date ────────────────────────────────

separator('STEP 0 — Seeding biographical date (Maria anniversary: 02-26)')

cortexRouter.profile.set('biographical_dates', {
    dates: [
        { label: 'Aniversário da Maria', date: '02-26', type: 'anniversary' },
    ],
})

const seeded = cortexRouter.profile.get('biographical_dates')
console.log('✅ Seeded:', JSON.stringify(seeded))

// ── Test 1: Absolute Agency ────────────────────────────────────────

separator('TEST 1 — Absolute Agency (Dynamic Risk Auto-Commit)')
console.log('Signal: "Buggy, regista 12 euros de almoço no restaurante da praça."')
console.log('Expected: risk_tier=low, threshold=0.88, nextAction=auto_committed')

const result1 = await cortexRouter.routeSignal({
    signalType: 'voice',
    rawText: 'Buggy, regista 12 euros de almoço no restaurante da praça.',
    channel: 'turing_test',
    metadata: { userId: USER_ID },
})

printResult('DECISION', {
    strategy: result1.strategy,
    route: result1.route,
    confidence: result1.confidence,
    nextAction: result1.nextAction,
    strictParametersMet: result1.strictParametersMet,
    reason: result1.reason,
})

const law1Pass =
    result1.nextAction === 'auto_committed' &&
    result1.reason.some((r) => r.includes('risk_tier=low')) &&
    result1.reason.some((r) => r.includes('dynamic_threshold=0.88'))

console.log(law1Pass
    ? '\n✅ LAW 1 VERIFIED: Auto-committed with dynamic threshold 0.88'
    : '\n⚠️  LAW 1: Not auto-committed — check confidence and strict params above')

// ── Test 2: Sherlock Protocol ──────────────────────────────────────

separator('TEST 2 — Sherlock Protocol (Calendar Deduction)')
console.log('Signal: "Comprei um ramo de flores por 35 euros na florista."')
console.log('Expected: sherlock:calendar_correlation in reason array')

const result2 = await cortexRouter.routeSignal({
    signalType: 'voice',
    rawText: 'Comprei um ramo de flores por 35 euros na florista.',
    channel: 'turing_test',
    metadata: { userId: USER_ID },
})

printResult('DECISION', {
    strategy: result2.strategy,
    route: result2.route,
    confidence: result2.confidence,
    nextAction: result2.nextAction,
    strictParametersMet: result2.strictParametersMet,
    reason: result2.reason,
})

const sherlockFired = result2.reason.some((r) => r.includes('sherlock:calendar_correlation'))
const law2CommitPass = result2.nextAction === 'auto_committed'

console.log(sherlockFired
    ? '\n✅ LAW 2 VERIFIED: Sherlock fired calendar_correlation deduction'
    : '\n⚠️  LAW 2: Sherlock did not fire — flores/flowers keyword may not have matched or biographical date too far')

console.log(law2CommitPass
    ? '✅ LAW 1+2 COMBINED: Still auto-committed through Sherlock + Executor'
    : '⚠️  Not auto-committed — check confidence score')

// ── Summary ────────────────────────────────────────────────────────

separator('TEST SUMMARY')
console.log(`Law 1 (Absolute Agency):     ${law1Pass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`Law 2 (Silent Deduction):    ${sherlockFired ? '✅ PASS' : '❌ FAIL'}`)
console.log(`Combined auto-commit (T2):   ${law2CommitPass ? '✅ PASS' : '❌ FAIL'}`)

// ── SQLite verification hint ───────────────────────────────────────

const { dataDir } = cortexRouter as unknown as { dataDir?: string }

separator('SQLite Verification')
console.log('Handshake audit trail is in:')
console.log(`  find ${process.cwd()} -name "subconscious.db"`)
console.log('\nThen run inside sqlite3:')
console.log(`  SELECT id, module, status,
         json_extract(payload_json, '$.source') as source,
         json_extract(payload_json, '$.risk_tier') as risk_tier,
         json_extract(payload_json, '$.dynamic_threshold') as dyn_threshold,
         json_extract(payload_json, '$.deductions') as deductions
  FROM handshake_events
  WHERE status = 'auto_committed'
  ORDER BY created_at DESC
  LIMIT 5;`)
