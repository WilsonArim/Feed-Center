import { MemoryRouter } from 'react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateEntryInput, FinancialEntry } from '@/types'
import { FinanceiroPage } from './FinanceiroPage'

const mocks = vi.hoisted(() => ({
    mockCreateEntry: vi.fn<(input: CreateEntryInput) => Promise<FinancialEntry>>(),
    mockUpdateEntry: vi.fn(),
    mockDeleteEntry: vi.fn<(id: string) => Promise<void>>(),
    mockReplaceReceiptItems: vi.fn(),
    mockLogOcrHandshakeEvent: vi.fn(),
    mockScanReceipt: vi.fn(),
    mockFindRule: vi.fn(),
    mockSaveRule: vi.fn(),
}))

let entryIdCounter = 0
let entriesData: FinancialEntry[] = []

vi.mock('@/components/core/AuthProvider', () => ({
    useAuth: () => ({
        user: { id: 'user-1', email: 'tester@feed.center' },
    }),
}))

vi.mock('@/i18n/useLocaleText', () => ({
    useLocaleText: () => ({
        txt: (_pt: string, en: string) => en,
        isEnglish: true,
    }),
}))

vi.mock('@/hooks/useUserSettings', () => ({
    useShowMerchantInsights: () => ({ data: false }),
}))

vi.mock('@/hooks/useTodos', () => ({
    useTodoLists: () => ({ data: [] }),
}))

vi.mock('@/hooks/useFinancial', () => ({
    useEntries: () => ({
        data: entriesData,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useMonthSummary: () => ({
        data: { income: 0, expenses: 0, balance: 0 },
        isLoading: false,
    }),
    useCategoryBreakdown: () => ({
        data: [],
        isLoading: false,
    }),
    useMerchantInsights: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useItemInflationInsights: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useAffordabilityScore: () => ({
        data: null,
        isLoading: false,
    }),
    useCreateEntry: () => ({
        isPending: false,
        mutateAsync: mocks.mockCreateEntry,
    }),
    useUpdateEntry: () => ({
        isPending: false,
        mutateAsync: mocks.mockUpdateEntry,
    }),
    useDeleteEntry: () => ({
        isPending: false,
        mutateAsync: mocks.mockDeleteEntry,
    }),
    usePockets: () => ({
        data: [],
        isLoading: false,
        isError: false,
    }),
    useDeletePocket: () => ({
        isPending: false,
        mutateAsync: vi.fn(),
    }),
    useCreatePocket: () => ({
        isPending: false,
        mutateAsync: vi.fn(),
    }),
    useUpdatePocket: () => ({
        isPending: false,
        mutateAsync: vi.fn(),
    }),
}))

vi.mock('@/services/financialService', () => ({
    financialService: {
        replaceReceiptItems: mocks.mockReplaceReceiptItems,
        logOcrHandshakeEvent: mocks.mockLogOcrHandshakeEvent,
    },
}))

vi.mock('@/services/ocrService', () => ({
    ocrService: {
        scanReceipt: mocks.mockScanReceipt,
    },
}))

vi.mock('@/services/receiptLearningService', () => ({
    receiptLearningService: {
        findRule: mocks.mockFindRule,
        saveRule: mocks.mockSaveRule,
    },
}))

function renderPage() {
    return render(
        <MemoryRouter>
            <FinanceiroPage />
        </MemoryRouter>
    )
}

describe('Financeiro scan symbiosis flow (E2E)', () => {
    beforeEach(() => {
        entryIdCounter = 0
        entriesData = []
        mocks.mockReplaceReceiptItems.mockReset()
        mocks.mockLogOcrHandshakeEvent.mockReset()
        mocks.mockScanReceipt.mockReset()
        mocks.mockFindRule.mockReset()
        mocks.mockSaveRule.mockReset()
        mocks.mockUpdateEntry.mockReset()

        mocks.mockDeleteEntry.mockReset()
        mocks.mockDeleteEntry.mockImplementation(async (id: string) => {
            entriesData = entriesData.filter((entry) => entry.id !== id)
        })

        mocks.mockCreateEntry.mockReset()
        mocks.mockCreateEntry.mockImplementation(async (input: CreateEntryInput) => {
            entryIdCounter += 1
            const created: FinancialEntry = {
                id: `entry-${entryIdCounter}`,
                user_id: 'user-1',
                type: input.type,
                amount: input.amount,
                currency: input.currency ?? 'EUR',
                category: input.category,
                subcategory: null,
                description: input.description ?? null,
                date: input.date,
                payment_method: input.payment_method ?? 'cash',
                is_recurring: input.is_recurring ?? false,
                recurring_day: input.recurring_day ?? null,
                periodicity: input.periodicity ?? null,
                buggy_alert: input.buggy_alert ?? false,
                buggy_alert_days: input.buggy_alert_days ?? null,
                receipt_url: null,
                receipt_merchant: input.receipt_merchant ?? null,
                receipt_nif: input.receipt_nif ?? null,
                pocket_id: null,
                project_id: null,
                ai_suggested_category: false,
                confidence_score: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
            entriesData = [created, ...entriesData]
            return created
        })
    })

    it('forces inline edit when confidence gate is below 93%, then persists and supports undo', async () => {
        mocks.mockFindRule.mockReturnValue(null)
        mocks.mockScanReceipt.mockResolvedValue({
            merchant: 'Uber',
            nif: '123456789',
            date: '2026-02-21',
            total: { amount: 18.4, currency: 'EUR' },
            items: ['Trip'],
            receiptItems: [],
            confidence: 0.82,
            suggestion: { type: 'expense', category: 'Transporte', confidence: 0.88, source: 'heuristic' },
            engine: 'vision',
        })

        const user = userEvent.setup()
        const { container } = renderPage()

        const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement
        expect(hiddenInput).toBeTruthy()

        const file = new File(['fake-image'], 'receipt.png', { type: 'image/png' })
        await user.upload(hiddenInput, file)

        await screen.findByText(/receipt signal processed/i)
        const confirmButton = await screen.findByRole('button', { name: /confirm/i })

        await user.click(confirmButton)
        expect(await screen.findByText(/gate < 93%/i)).toBeInTheDocument()
        expect(mocks.mockCreateEntry).not.toHaveBeenCalled()

        const merchantInlineInput = screen.getByDisplayValue('Uber')
        await user.clear(merchantInlineInput)
        await user.type(merchantInlineInput, 'Uber Eats')

        await user.click(confirmButton)

        await waitFor(() => expect(mocks.mockCreateEntry).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(screen.getByText('Uber Eats')).toBeInTheDocument())
        await waitFor(() => expect(mocks.mockLogOcrHandshakeEvent).toHaveBeenCalledTimes(1))
        expect(mocks.mockLogOcrHandshakeEvent.mock.calls[0]?.[1]).toMatchObject({
            requiresEdit: true,
            editedFields: expect.arrayContaining(['merchant']),
        })

        const undoButton = await screen.findByRole('button', { name: /undo/i })
        await user.click(undoButton)
        await waitFor(() => expect(mocks.mockDeleteEntry).toHaveBeenCalledTimes(1))
    })

    it('allows direct handshake with no inline edit when confidence gate is >= 93%', async () => {
        mocks.mockFindRule.mockReturnValue({ type: 'expense', category: 'Transporte' })
        mocks.mockScanReceipt.mockResolvedValue({
            merchant: 'Uber',
            nif: null,
            date: '2026-02-21',
            total: { amount: 9.9, currency: 'EUR' },
            items: ['Trip'],
            receiptItems: [],
            confidence: 0.97,
            suggestion: { type: 'expense', category: 'Transporte', confidence: 0.95, source: 'heuristic' },
            engine: 'vision',
        })

        const user = userEvent.setup()
        const { container } = renderPage()
        const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement
        const file = new File(['fake-image'], 'receipt.png', { type: 'image/png' })
        fireEvent.change(hiddenInput, { target: { files: [file] } })

        await screen.findByText(/gate >= 93%/i)
        await user.click(await screen.findByRole('button', { name: /confirm/i }))

        await waitFor(() => expect(mocks.mockCreateEntry).toHaveBeenCalledTimes(1))
        expect(mocks.mockLogOcrHandshakeEvent.mock.calls[0]?.[1]).toMatchObject({
            requiresEdit: false,
            editedFields: [],
        })
    })
})
