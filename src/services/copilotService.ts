/**
 * Copilot Buggy — Site-Wide AI Assistant
 *
 * Architecture: OpenAI tool-calling (function calling)
 * The model receives tool definitions, decides when to call them,
 * and we execute via existing service layer.
 *
 * Permission Tiers:
 *   🟢 Read   — automatic
 *   🟡 Create — automatic
 *   🔴 Delete/Modify — requires user confirmation
 */

import { todoService } from '@/services/todoService'
import { financialService } from '@/services/financialService'
import { linksService } from '@/services/linksService'
import { web3Service } from '@/services/web3Service'
import { coinGeckoService } from '@/services/coinGeckoService'

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

// ─── Types ───

export interface CopilotMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    tool_call_id?: string
    tool_calls?: ToolCall[]
}

interface ToolCall {
    id: string
    type: 'function'
    function: { name: string; arguments: string }
}

export interface PendingConfirmation {
    toolName: string
    args: Record<string, unknown>
    description: string
    toolCallId: string
}

type ToolTier = 'read' | 'create' | 'destructive'

// ─── Tool Definitions (OpenAI schema) ───

const TOOL_TIERS: Record<string, ToolTier> = {
    // Todos
    get_todos: 'read', get_todo_lists: 'read',
    create_todo: 'create', create_todo_list: 'create',
    update_todo: 'destructive', delete_todo: 'destructive',
    // Financial
    get_entries: 'read', get_month_summary: 'read',
    get_category_breakdown: 'read', get_affordability_score: 'read',
    get_pockets: 'read',
    create_entry: 'create',
    update_entry: 'destructive', delete_entry: 'destructive',
    // Crypto
    get_portfolio: 'read', get_transactions: 'read',
    create_transaction: 'create',
    delete_transaction: 'destructive',
    // Links
    get_links: 'read', get_tags: 'read',
    create_link: 'create',
    delete_link: 'destructive',
    // Crypto analysis
    analyze_hash: 'read',
}

const TOOLS = [
    // ─── Todos ───
    { type: 'function' as const, function: { name: 'get_todos', description: 'Listar todos/tarefas do utilizador. Pode filtrar por lista.', parameters: { type: 'object', properties: { list_id: { type: 'string', description: 'ID da lista (null = inbox)' } } } } },
    { type: 'function' as const, function: { name: 'get_todo_lists', description: 'Listar todas as listas de todos.', parameters: { type: 'object', properties: {} } } },
    { type: 'function' as const, function: { name: 'create_todo', description: 'Criar um novo todo/tarefa.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, list_id: { type: 'string' } }, required: ['title'] } } },
    { type: 'function' as const, function: { name: 'create_todo_list', description: 'Criar uma nova lista de todos.', parameters: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' } }, required: ['name'] } } },
    { type: 'function' as const, function: { name: 'update_todo', description: 'Atualizar um todo existente (título, status, prioridade). REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, status: { type: 'string', enum: ['todo', 'in_progress', 'done'] }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } }, required: ['id'] } } },
    { type: 'function' as const, function: { name: 'delete_todo', description: 'Apagar um todo. REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },

    // ─── Financial ───
    { type: 'function' as const, function: { name: 'get_entries', description: 'Listar entradas financeiras de um mês (formato: YYYY-MM).', parameters: { type: 'object', properties: { month: { type: 'string', description: 'Mês no formato YYYY-MM' }, type: { type: 'string', enum: ['income', 'expense'] }, category: { type: 'string' } }, required: ['month'] } } },
    { type: 'function' as const, function: { name: 'get_month_summary', description: 'Resumo financeiro do mês: receita, despesas, saldo.', parameters: { type: 'object', properties: { month: { type: 'string', description: 'YYYY-MM' } }, required: ['month'] } } },
    { type: 'function' as const, function: { name: 'get_category_breakdown', description: 'Breakdown de despesas por categoria num mês.', parameters: { type: 'object', properties: { month: { type: 'string' } }, required: ['month'] } } },
    { type: 'function' as const, function: { name: 'get_affordability_score', description: 'Score de saúde financeira para o mês.', parameters: { type: 'object', properties: { month: { type: 'string' } }, required: ['month'] } } },
    { type: 'function' as const, function: { name: 'get_pockets', description: 'Listar pockets (fundos de poupança).', parameters: { type: 'object', properties: {} } } },
    { type: 'function' as const, function: { name: 'create_entry', description: 'Adicionar entrada financeira (receita ou despesa).', parameters: { type: 'object', properties: { type: { type: 'string', enum: ['income', 'expense'] }, amount: { type: 'number' }, description: { type: 'string' }, category: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, is_recurring: { type: 'boolean' } }, required: ['type', 'amount', 'description', 'category', 'date'] } } },
    { type: 'function' as const, function: { name: 'update_entry', description: 'Editar entrada financeira. REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' }, amount: { type: 'number' }, description: { type: 'string' }, category: { type: 'string' } }, required: ['id'] } } },
    { type: 'function' as const, function: { name: 'delete_entry', description: 'Apagar entrada financeira. REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },

    // ─── Crypto ───
    { type: 'function' as const, function: { name: 'get_portfolio', description: 'Ver portfolio cripto completo com preços, PnL e holdings computados.', parameters: { type: 'object', properties: {} } } },
    { type: 'function' as const, function: { name: 'get_transactions', description: 'Listar todas as transações cripto.', parameters: { type: 'object', properties: {} } } },
    { type: 'function' as const, function: { name: 'create_transaction', description: 'Registar nova transação cripto (compra, venda, swap, airdrop).', parameters: { type: 'object', properties: { type: { type: 'string', enum: ['buy', 'sell', 'swap', 'airdrop', 'transfer_in'] }, symbol: { type: 'string' }, name: { type: 'string' }, quantity: { type: 'number' }, price_per_unit: { type: 'number' }, exchange: { type: 'string' }, pair: { type: 'string' }, fee: { type: 'number' }, notes: { type: 'string' }, executed_at: { type: 'string' }, wallet_id: { type: 'string' } }, required: ['type', 'symbol', 'name', 'quantity', 'wallet_id', 'executed_at'] } } },
    { type: 'function' as const, function: { name: 'delete_transaction', description: 'Apagar transação cripto. REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },

    // ─── Links ───
    { type: 'function' as const, function: { name: 'get_links', description: 'Listar links guardados. Pode pesquisar por texto ou tag.', parameters: { type: 'object', properties: { search: { type: 'string' }, tag: { type: 'string' }, pinned: { type: 'boolean' } } } } },
    { type: 'function' as const, function: { name: 'get_tags', description: 'Listar todas as tags de links.', parameters: { type: 'object', properties: {} } } },
    { type: 'function' as const, function: { name: 'create_link', description: 'Guardar um novo link.', parameters: { type: 'object', properties: { url: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' }, pinned: { type: 'boolean' } }, required: ['url'] } } },
    { type: 'function' as const, function: { name: 'delete_link', description: 'Apagar link. REQUER CONFIRMAÇÃO.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },

    // ─── Crypto Analysis ───
    { type: 'function' as const, function: { name: 'analyze_hash', description: 'Analisar um hash de transação blockchain (formato, chain, etc).', parameters: { type: 'object', properties: { hash: { type: 'string' }, chain: { type: 'string' } }, required: ['hash'] } } },
]

// ─── System Prompt ───

const SYSTEM_PROMPT = `Tu és o Buggy 🐛, o copilot do Feed Center — uma app pessoal de produtividade e finanças.

CAPACIDADES:
- 📋 Todos: criar, listar, editar, apagar tarefas e listas
- 💰 Financeiro: ver saldo, entradas, categorias, pockets, adicionar despesas/receitas
- 🪙 Crypto: ver portfolio, transações, registar compras/vendas, analisar hashes
- 🔗 Links: guardar, pesquisar, listar links e tags

REGRAS:
1. Responde SEMPRE em Português (PT)
2. Sê conciso e direto — máximo 2-3 frases por resposta
3. Para operações de LEITURA (🟢) e CRIAÇÃO (🟡): executa imediatamente
4. Para EDITAR ou APAGAR (🔴): informa o que vais fazer e pede confirmação
5. Nunca inventes dados — usa APENAS os tools disponíveis
6. Se não tens informação suficiente para executar um tool, pergunta
7. Usa emojis relevantes mas sem exagero
8. Para datas, o mês atual é ${new Date().toISOString().slice(0, 7)} e hoje é ${new Date().toISOString().slice(0, 10)}
9. Formata valores em EUR (€) e quantidades cripto com precisão
10. Se o utilizador pedir algo fora do teu scope, diz que não consegues ajudar com isso

Tu NÃO:
- Expões API keys, tokens, ou dados de autenticação
- Apagas dados sem confirmação explícita
- Fazes operações em massa sem aprovação
- Ages fora do scope dos tools definidos`

// ─── Tool Executor ───

async function executeTool(
    name: string,
    args: Record<string, unknown>,
    userId: string
): Promise<string> {
    try {
        switch (name) {
            // ── Todos ──
            case 'get_todos': {
                const todos = await todoService.getTodos(userId, (args.list_id as string) ?? null)
                if (todos.length === 0) return 'Nenhum todo encontrado.'
                return JSON.stringify(todos.map(t => ({
                    id: t.id, title: t.title, status: t.status,
                    priority: t.priority, list_id: t.list_id
                })))
            }
            case 'get_todo_lists': {
                const lists = await todoService.getLists(userId)
                return JSON.stringify(lists.map(l => ({ id: l.id, title: l.title, color: l.color })))
            }
            case 'create_todo': {
                const todo = await todoService.createTodo(userId, {
                    title: args.title as string,
                    description: (args.description as string) || undefined,
                    priority: (args.priority as 'low' | 'medium' | 'high') || 'medium',
                    status: 'todo' as const,
                    list_id: (args.list_id as string) || undefined,
                })
                return `✅ Todo criado: "${todo.title}" (id: ${todo.id})`
            }
            case 'create_todo_list': {
                const list = await todoService.createList(userId, {
                    title: args.name as string,
                    type: 'list' as const,
                    color: (args.color as string) || undefined,
                    icon: (args.icon as string) || undefined,
                })
                return `✅ Lista criada: "${list.title}" (id: ${list.id})`
            }
            case 'update_todo': {
                const { id, ...updates } = args
                const todo = await todoService.updateTodo(id as string, userId, updates)
                return `✅ Todo atualizado: "${todo.title}"`
            }
            case 'delete_todo': {
                await todoService.deleteTodo(args.id as string, userId)
                return '🗑️ Todo apagado.'
            }

            // ── Financial ──
            case 'get_entries': {
                const entries = await financialService.getEntries(userId, {
                    month: args.month as string,
                    type: args.type as string | undefined,
                    category: args.category as string | undefined,
                })
                if (entries.length === 0) return 'Nenhuma entrada encontrada para este mês.'
                return JSON.stringify(entries.map(e => ({
                    id: e.id, type: e.type, amount: e.amount,
                    description: e.description, category: e.category, date: e.date
                })))
            }
            case 'get_month_summary': {
                const summary = await financialService.getMonthSummary(userId, args.month as string)
                return JSON.stringify(summary)
            }
            case 'get_category_breakdown': {
                const breakdown = await financialService.getCategoryBreakdown(userId, args.month as string)
                return JSON.stringify(breakdown)
            }
            case 'get_affordability_score': {
                const score = await financialService.getAffordabilityScore(userId, args.month as string)
                return JSON.stringify(score)
            }
            case 'get_pockets': {
                const pockets = await financialService.getPockets(userId)
                return JSON.stringify(pockets.map(p => ({
                    id: p.id, name: p.name, balance: p.current_balance, limit: p.budget_limit
                })))
            }
            case 'create_entry': {
                const entry = await financialService.createEntry(userId, {
                    type: args.type as 'income' | 'expense',
                    amount: args.amount as number,
                    description: args.description as string,
                    category: args.category as string,
                    date: args.date as string,
                    is_recurring: args.is_recurring as boolean | undefined,
                } as Parameters<typeof financialService.createEntry>[1])
                return `✅ Entrada criada: ${entry.type === 'income' ? '📈' : '📉'} ${entry.description} — €${entry.amount}`
            }
            case 'update_entry': {
                const { id, ...updates } = args
                const entry = await financialService.updateEntry(userId, id as string, updates as Parameters<typeof financialService.updateEntry>[2])
                return `✅ Entrada atualizada: "${entry.description}"`
            }
            case 'delete_entry': {
                await financialService.deleteEntry(userId, args.id as string)
                return '🗑️ Entrada financeira apagada.'
            }

            // ── Crypto ──
            case 'get_portfolio': {
                const txs = await web3Service.getTransactions(userId)
                const holdings = web3Service.computeHoldings(txs)
                // Enrich with prices
                const ids = holdings.filter(h => h.coingecko_id).map(h => h.coingecko_id!)
                const prices = ids.length > 0 ? await coinGeckoService.fetchPrices(ids) : {}
                const result = holdings.map(h => {
                    const p = h.coingecko_id ? prices[h.coingecko_id] : undefined
                    const price = p?.eur ?? 0
                    return {
                        symbol: h.symbol, name: h.name, qty: h.total_quantity,
                        avg_buy: h.avg_buy_price, price, value: h.total_quantity * price,
                        unrealized_pnl: price > 0 ? (price - h.avg_buy_price) * h.total_quantity : 0,
                        realized_pnl: h.realized_pnl, txs: h.transaction_count
                    }
                })
                return JSON.stringify(result)
            }
            case 'get_transactions': {
                const txs = await web3Service.getTransactions(userId)
                return JSON.stringify(txs.map(t => ({
                    id: t.id, type: t.type, symbol: t.symbol, qty: t.quantity,
                    price: t.price_per_unit, date: t.executed_at, source: t.source, exchange: t.exchange
                })))
            }
            case 'create_transaction': {
                const tx = await web3Service.addTransaction(userId, {
                    type: args.type as Parameters<typeof web3Service.addTransaction>[1]['type'],
                    symbol: (args.symbol as string).toUpperCase(),
                    name: args.name as string,
                    quantity: args.quantity as number,
                    price_per_unit: args.price_per_unit as number | undefined,
                    exchange: args.exchange as string | undefined,
                    pair: args.pair as string | undefined,
                    fee: args.fee as number | undefined,
                    notes: args.notes as string | undefined,
                    executed_at: args.executed_at as string,
                    wallet_id: args.wallet_id as string,
                    source: 'manual',
                })
                return `✅ Transação registada: ${tx.type} ${tx.quantity} ${tx.symbol}`
            }
            case 'delete_transaction': {
                await web3Service.deleteTransaction(userId, args.id as string)
                return '🗑️ Transação apagada.'
            }

            // ── Links ──
            case 'get_links': {
                const links = await linksService.getLinks(userId, {
                    search: args.search as string | undefined,
                    tag: args.tag as string | undefined,
                    pinned: args.pinned as boolean | undefined,
                })
                if (links.length === 0) return 'Nenhum link encontrado.'
                return JSON.stringify(links.map(l => ({
                    id: l.id, url: l.url, title: l.title, tags: l.tags, pinned: l.pinned
                })))
            }
            case 'get_tags': {
                const tags = await linksService.getAllTags(userId)
                return tags.length > 0 ? `Tags: ${tags.join(', ')}` : 'Nenhuma tag encontrada.'
            }
            case 'create_link': {
                const link = await linksService.createLink(userId, {
                    url: args.url as string,
                    title: args.title as string | undefined,
                    description: args.description as string | undefined,
                    tags: args.tags as string[] | undefined,
                    notes: args.notes as string | undefined,
                    pinned: args.pinned as boolean | undefined,
                })
                return `✅ Link guardado: "${link.title}" — ${link.url}`
            }
            case 'delete_link': {
                await linksService.deleteLink(args.id as string, userId)
                return '🗑️ Link apagado.'
            }

            // ── Analysis ──
            case 'analyze_hash': {
                // Inline analysis from hash format
                const hash = args.hash as string
                let chain = args.chain as string | undefined
                if (!chain) {
                    if (hash.startsWith('0x') && hash.length === 66) chain = 'ethereum'
                    else if (hash.length >= 80 && hash.length <= 100) chain = 'solana'
                }
                return JSON.stringify({
                    hash: hash.slice(0, 12) + '...',
                    detected_chain: chain ?? 'desconhecida',
                    note: 'Auto-parse via Solscan/Etherscan em breve. Por agora, regista manualmente e adiciona o hash.'
                })
            }

            default:
                return `Tool "${name}" não implementado.`
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido'
        return `❌ Erro: ${msg}`
    }
}

// ─── Main Chat Function ───

export const copilotService = {
    isAvailable(): boolean {
        return !!import.meta.env.VITE_OPENAI_API_KEY
    },

    /**
     * Main chat loop with tool-calling.
     * Returns the final assistant message AND any pending confirmations.
     */
    async chat(
        messages: CopilotMessage[],
        userId: string,
    ): Promise<{
        reply: string
        updatedMessages: CopilotMessage[]
        pendingConfirmation: PendingConfirmation | null
    }> {
        const key = import.meta.env.VITE_OPENAI_API_KEY
        if (!key) {
            return {
                reply: '⚠️ OpenAI API key não configurada.',
                updatedMessages: messages,
                pendingConfirmation: null,
            }
        }

        // Build full message list with system prompt
        const fullMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...messages,
        ]

        let currentMessages = [...fullMessages]
        let iterations = 0
        const MAX_ITERATIONS = 5 // Safety limit

        while (iterations < MAX_ITERATIONS) {
            iterations++

            const res = await fetch(OPENAI_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: currentMessages,
                    tools: TOOLS,
                    temperature: 0.4,
                    max_tokens: 800,
                }),
            })

            if (!res.ok) {
                const err = await res.text()
                console.error('OpenAI error:', err)
                return {
                    reply: `⚠️ Erro na API (${res.status}). Tenta novamente.`,
                    updatedMessages: messages,
                    pendingConfirmation: null,
                }
            }

            const data = await res.json()
            const choice = data.choices?.[0]
            const assistantMsg = choice?.message

            if (!assistantMsg) {
                return {
                    reply: '⚠️ Sem resposta do modelo.',
                    updatedMessages: messages,
                    pendingConfirmation: null,
                }
            }

            // If no tool calls, we have the final response
            if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
                const updatedMessages: CopilotMessage[] = [
                    ...messages,
                    { role: 'assistant', content: assistantMsg.content ?? '' },
                ]
                return {
                    reply: assistantMsg.content ?? '',
                    updatedMessages,
                    pendingConfirmation: null,
                }
            }

            // Process tool calls
            currentMessages.push({
                role: 'assistant',
                content: assistantMsg.content ?? '',
                tool_calls: assistantMsg.tool_calls,
            })

            for (const toolCall of assistantMsg.tool_calls) {
                const fnName = toolCall.function.name
                const fnArgs = JSON.parse(toolCall.function.arguments || '{}')
                const tier = TOOL_TIERS[fnName]

                // 🔴 Destructive: pause and ask for confirmation
                if (tier === 'destructive') {
                    const descriptions: Record<string, string> = {
                        delete_todo: `Apagar todo (id: ${fnArgs.id})`,
                        update_todo: `Editar todo (id: ${fnArgs.id})`,
                        delete_entry: `Apagar entrada financeira (id: ${fnArgs.id})`,
                        update_entry: `Editar entrada financeira (id: ${fnArgs.id})`,
                        delete_transaction: `Apagar transação cripto (id: ${fnArgs.id})`,
                        delete_link: `Apagar link (id: ${fnArgs.id})`,
                    }

                    return {
                        reply: `⚠️ **Ação destrutiva:** ${descriptions[fnName] ?? fnName}\n\nConfirmas?`,
                        updatedMessages: [
                            ...messages,
                            { role: 'assistant', content: assistantMsg.content ?? '', tool_calls: assistantMsg.tool_calls },
                        ],
                        pendingConfirmation: {
                            toolName: fnName,
                            args: fnArgs,
                            description: descriptions[fnName] ?? fnName,
                            toolCallId: toolCall.id,
                        },
                    }
                }

                // 🟢🟡 Read/Create: execute immediately
                const result = await executeTool(fnName, fnArgs, userId)
                currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: result,
                })
            }
        }

        return {
            reply: '⚠️ Demasiadas iterações. Tenta simplificar o pedido.',
            updatedMessages: messages,
            pendingConfirmation: null,
        }
    },

    /**
     * Execute a confirmed destructive tool call.
     */
    async executeConfirmed(
        messages: CopilotMessage[],
        confirmation: PendingConfirmation,
        userId: string,
    ): Promise<{ reply: string; updatedMessages: CopilotMessage[] }> {
        const result = await executeTool(confirmation.toolName, confirmation.args, userId)

        // Add tool result and get final response
        const key = import.meta.env.VITE_OPENAI_API_KEY
        if (!key) {
            return { reply: result, updatedMessages: messages }
        }

        const fullMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            ...messages,
            { role: 'tool' as const, content: result, tool_call_id: confirmation.toolCallId },
        ]

        try {
            const res = await fetch(OPENAI_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: fullMessages,
                    temperature: 0.4,
                    max_tokens: 400,
                }),
            })

            if (!res.ok) return { reply: result, updatedMessages: messages }

            const data = await res.json()
            const content = data.choices?.[0]?.message?.content ?? result

            return {
                reply: content,
                updatedMessages: [
                    ...messages,
                    { role: 'tool', content: result, tool_call_id: confirmation.toolCallId },
                    { role: 'assistant', content },
                ],
            }
        } catch {
            return { reply: result, updatedMessages: messages }
        }
    },
}
