import { z } from 'zod'

const JsonRecordSchema = z.record(z.unknown())

export const CortexSignalTypeSchema = z.enum(['text', 'voice', 'ocr'])
export const CortexModuleSchema = z.enum(['FinanceModule', 'TodoModule', 'CryptoModule', 'LinksModule', 'OpenAIModule'])
export const HandshakeStatusSchema = z.enum(['pending_confirmation', 'approved', 'rejected', 'failed'])
export const SynapticMemoryKindSchema = z.enum(['completed_task', 'recurring_merchant', 'past_context', 'ocr_context'])

export const OcrTraceSchema = z.object({
    merchant: z.string().trim().min(1).max(200).optional(),
    amount: z.number().positive().max(1_000_000).optional(),
    currency: z.string().trim().min(3).max(8).optional(),
    confidence: z.number().min(0).max(1).optional(),
    rawPayload: JsonRecordSchema.optional(),
})

export const CortexRoutePayloadSchema = z.object({
    signal_type: CortexSignalTypeSchema,
    raw_text: z.string().trim().min(1).max(20_000),
    channel: z.string().trim().min(1).max(80).optional(),
    metadata: JsonRecordSchema.optional(),
    ocr_trace: OcrTraceSchema.optional(),
})

export const SynapticMemorySchema = z.object({
    kind: SynapticMemoryKindSchema,
    text: z.string().trim().min(1).max(4_000),
    metadata: JsonRecordSchema.optional(),
})

export const CortexHandshakePayloadSchema = z.object({
    raw_signal_id: z.string().trim().min(1),
    module: CortexModuleSchema,
    status: HandshakeStatusSchema,
    confidence: z.number().min(0).max(1).optional(),
    payload: JsonRecordSchema.optional(),
    memory: z.array(SynapticMemorySchema).max(12).optional(),
})

export type CortexRoutePayload = z.infer<typeof CortexRoutePayloadSchema>
export type CortexHandshakePayload = z.infer<typeof CortexHandshakePayloadSchema>
