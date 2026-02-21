import { motion } from 'framer-motion'
import { NavLink } from 'react-router'
import {
    BookOpen,
    Wallet,
    CheckSquare,
    Link2,
    Newspaper,
    Bitcoin,
    Settings2,
    Sparkles,
    ArrowRight,
    Target,
    CircleDollarSign,
    Rocket,
    type LucideIcon,
} from 'lucide-react'
import { NextActionsStrip, PageHeader, PageSectionHeader } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'

interface GuideCard {
    icon: LucideIcon
    titlePt: string
    titleEn: string
    tipPt: string
    tipEn: string
    ctaPt: string
    ctaEn: string
    to: string
}

interface PathCard {
    icon: LucideIcon
    titlePt: string
    titleEn: string
    bodyPt: string
    bodyEn: string
    resultPt: string
    resultEn: string
    ctaPt: string
    ctaEn: string
    to: string
}

const quickSteps = [
    {
        titlePt: '1. Define o teu foco',
        titleEn: '1. Set your focus',
        bodyPt: 'Abre Tarefas, cria 3 prioridades do dia e escolhe 1 tarefa critica.',
        bodyEn: 'Open Tasks, create 3 priorities for today, and choose 1 critical task.',
    },
    {
        titlePt: '2. Regista caixa em 60 segundos',
        titleEn: '2. Log cash in 60 seconds',
        bodyPt: 'No Financeiro, usa Registo Rapido para adicionar entradas sem friccao.',
        bodyEn: 'In Finance, use Quick Entry to add transactions with minimal friction.',
    },
    {
        titlePt: '3. Fecha o ciclo',
        titleEn: '3. Close the loop',
        bodyPt: 'Liga noticias, links e cripto a tarefas para transformar input em execucao.',
        bodyEn: 'Link news, links, and crypto to tasks to turn input into execution.',
    },
]

const recommendedPaths: PathCard[] = [
    {
        icon: Target,
        titlePt: 'Percurso 1: Claridade diária',
        titleEn: 'Path 1: Daily clarity',
        bodyPt: 'Começa no Dashboard para perceber em 30 segundos o que entrou, saiu e exige ação.',
        bodyEn: 'Start in Dashboard to understand in 30 seconds what came in, out, and needs action.',
        resultPt: 'Resultado: foco imediato sem sobrecarga.',
        resultEn: 'Result: instant focus without overload.',
        ctaPt: 'Abrir dashboard',
        ctaEn: 'Open dashboard',
        to: '/dashboard',
    },
    {
        icon: CircleDollarSign,
        titlePt: 'Percurso 2: Dominar caixa',
        titleEn: 'Path 2: Master cash flow',
        bodyPt: 'Vai para Financeiro, digitaliza talão e fecha o loop: captura → classifica → confirma.',
        bodyEn: 'Go to Finance, scan a receipt, and close the loop: capture → classify → confirm.',
        resultPt: 'Resultado: visão real de gastos e inflação por loja/item.',
        resultEn: 'Result: real spend visibility and store/item inflation signals.',
        ctaPt: 'Abrir financeiro',
        ctaEn: 'Open finance',
        to: '/financeiro',
    },
    {
        icon: Rocket,
        titlePt: 'Percurso 3: Execução agressiva',
        titleEn: 'Path 3: Aggressive execution',
        bodyPt: 'Abre Tarefas e transforma rapidamente insights em ações com prioridade.',
        bodyEn: 'Open Tasks and quickly turn insights into prioritized actions.',
        resultPt: 'Resultado: menos backlog, mais entrega.',
        resultEn: 'Result: less backlog, more delivery.',
        ctaPt: 'Abrir tarefas',
        ctaEn: 'Open tasks',
        to: '/todo',
    },
]

const guideCards: GuideCard[] = [
    {
        icon: Wallet,
        titlePt: 'Financeiro',
        titleEn: 'Finance',
        tipPt: 'Usa o scan de recibo para captar loja + NIF. Ativa nas Definições a vista de histórico por loja e variação de preço.',
        tipEn: 'Use receipt scan to capture store + VAT/NIF. Enable store history and price variation view in Settings.',
        ctaPt: 'Abrir financeiro',
        ctaEn: 'Open finance',
        to: '/financeiro',
    },
    {
        icon: CheckSquare,
        titlePt: 'Tarefas',
        titleEn: 'Tasks',
        tipPt: 'Move no kanban por prioridade e mantem o backlog curto.',
        tipEn: 'Move cards on kanban by priority and keep backlog short.',
        ctaPt: 'Abrir tarefas',
        ctaEn: 'Open tasks',
        to: '/todo',
    },
    {
        icon: Link2,
        titlePt: 'Links',
        titleEn: 'Links',
        tipPt: 'Guarda fontes com tags para recuperar contexto sem perder tempo.',
        tipEn: 'Save sources with tags to recover context fast.',
        ctaPt: 'Abrir links',
        ctaEn: 'Open links',
        to: '/links',
    },
    {
        icon: Newspaper,
        titlePt: 'Noticias',
        titleEn: 'News',
        tipPt: 'Filtra temas e transforma sinais importantes em tarefas.',
        tipEn: 'Filter topics and convert relevant signals into tasks.',
        ctaPt: 'Abrir noticias',
        ctaEn: 'Open news',
        to: '/news',
    },
    {
        icon: Bitcoin,
        titlePt: 'Cripto',
        titleEn: 'Crypto',
        tipPt: 'Regista transacoes e acompanha exposicao entre spot e DeFi.',
        tipEn: 'Track transactions and exposure across spot and DeFi.',
        ctaPt: 'Abrir cripto',
        ctaEn: 'Open crypto',
        to: '/crypto',
    },
    {
        icon: Settings2,
        titlePt: 'Definicoes',
        titleEn: 'Settings',
        tipPt: 'Escolhe idioma, tema e a pagina inicial ideal para ti.',
        tipEn: 'Choose language, theme, and your ideal start page.',
        ctaPt: 'Abrir definicoes',
        ctaEn: 'Open settings',
        to: '/settings',
    },
]

const productPrinciples = [
    {
        titlePt: 'Loop nuclear em 10s',
        titleEn: 'Nuclear loop in 10s',
        bodyPt: 'Capturar → entender → agir sem passos extra.',
        bodyEn: 'Capture → understand → act without extra steps.',
    },
    {
        titlePt: 'Input sem friccao',
        titleEn: 'Frictionless input',
        bodyPt: 'Texto natural, voz, OCR, screenshot, paste e drag-and-drop.',
        bodyEn: 'Natural language, voice, OCR, screenshot, paste, and drag-and-drop.',
    },
    {
        titlePt: 'Memoria acumulativa real',
        titleEn: 'Real cumulative memory',
        bodyPt: 'Quando corriges uma classificacao, o sistema aprende para o futuro.',
        bodyEn: 'When you correct a classification, the system learns it for future entries.',
    },
    {
        titlePt: 'Confianca absoluta',
        titleEn: 'Absolute trust',
        bodyPt: 'Origem da decisao, score de confianca e undo imediato.',
        bodyEn: 'Decision origin, confidence score, and instant undo.',
    },
    {
        titlePt: 'Acao proativa',
        titleEn: 'Proactive action',
        bodyPt: 'O sistema sugere automacao e proximos passos relevantes.',
        bodyEn: 'The system suggests automation and relevant next actions.',
    },
    {
        titlePt: 'Personalizacao util',
        titleEn: 'Useful personalization',
        bodyPt: 'Pagina inicial configuravel e nome do copiloto adaptado ao utilizador.',
        bodyEn: 'Configurable start page and personalized copilot name.',
    },
    {
        titlePt: 'Ritual diario',
        titleEn: 'Daily ritual',
        bodyPt: 'Responder diariamente: entrou, saiu e o que exige acao agora.',
        bodyEn: 'Daily answer: what came in, what went out, and what needs action now.',
    },
    {
        titlePt: 'Copiloto com identidade',
        titleEn: 'Copilot identity',
        bodyPt: 'Define nome e imagem do copiloto para uma interação mais natural.',
        bodyEn: 'Set copilot name and avatar for a more natural interaction.',
    },
]

export function StartGuidePage() {
    const { txt } = useLocaleText()

    return (
        <div className="w-full flex flex-col gap-8 pb-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
            >
                <PageHeader
                    icon={<BookOpen size={18} />}
                    title={txt('Guia e Ajuda', 'Guide & Help')}
                    subtitle={txt('Aprende o fluxo ideal para transformar o Feed Center em vantagem diaria.', 'Learn the ideal flow to turn Feed Center into daily advantage.')}
                    actions={(
                        <NavLink
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
                        >
                            <Sparkles size={16} />
                            {txt('Ir para dashboard', 'Go to dashboard')}
                        </NavLink>
                    )}
                />

                <PageSectionHeader
                    title={txt('Primeiros 5 minutos', 'First 5 minutes')}
                    subtitle={txt('Segue esta sequencia para perceber o produto rapidamente.', 'Follow this sequence to understand the product quickly.')}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quickSteps.map((step) => (
                        <div
                            key={step.titlePt}
                            className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                        >
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {txt(step.titlePt, step.titleEn)}
                            </p>
                            <p className="text-xs mt-2 leading-relaxed text-[var(--text-secondary)]">
                                {txt(step.bodyPt, step.bodyEn)}
                            </p>
                        </div>
                    ))}
                </div>

                <PageSectionHeader
                    title={txt('Escolhe o teu percurso', 'Choose your path')}
                    subtitle={txt('Cada utilizador pensa diferente. Escolhe o caminho que te dá valor já.', 'Every user thinks differently. Pick the path that gives you value now.')}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {recommendedPaths.map((path) => (
                        <div
                            key={path.to}
                            className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-3"
                        >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--accent)]/12 text-[var(--accent)]">
                                <path.icon size={16} />
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {txt(path.titlePt, path.titleEn)}
                            </p>
                            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                                {txt(path.bodyPt, path.bodyEn)}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                                {txt(path.resultPt, path.resultEn)}
                            </p>
                            <NavLink
                                to={path.to}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors w-fit mt-auto"
                            >
                                {txt(path.ctaPt, path.ctaEn)}
                                <ArrowRight size={12} />
                            </NavLink>
                        </div>
                    ))}
                </div>

                <PageSectionHeader
                    title={txt('Como usar cada modulo', 'How to use each module')}
                    subtitle={txt('Resumo tatico para nao desperdicar funcionalidades.', 'Tactical summary so you do not waste capabilities.')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {guideCards.map((card) => (
                        <div
                            key={card.to}
                            className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-2 text-[var(--accent)]">
                                <card.icon size={16} />
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                    {txt(card.titlePt, card.titleEn)}
                                </h3>
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                                {txt(card.tipPt, card.tipEn)}
                            </p>
                            <NavLink
                                to={card.to}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors w-fit"
                            >
                                {txt(card.ctaPt, card.ctaEn)}
                                <ArrowRight size={12} />
                            </NavLink>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {txt('Atalhos uteis', 'Useful shortcuts')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            {txt('Abrir input rapido', 'Open quick input')}: <kbd className="text-[var(--text-primary)]">Cmd/Ctrl + K</kbd>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            {txt('Fechar modal', 'Close modal')}: <kbd className="text-[var(--text-primary)]">Esc</kbd>
                        </span>
                    </div>
                </div>

                <PageSectionHeader
                    title={txt('Principios de Produto', 'Product Principles')}
                    subtitle={txt('Os 8 pilares que guiam a experiencia do Feed Center.', 'The 8 pillars that guide the Feed Center experience.')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {productPrinciples.map((principle) => (
                        <div
                            key={principle.titlePt}
                            className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                        >
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {txt(principle.titlePt, principle.titleEn)}
                            </p>
                            <p className="text-xs mt-2 leading-relaxed text-[var(--text-secondary)]">
                                {txt(principle.bodyPt, principle.bodyEn)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {txt('NIF e histórico por loja', 'NIF and store history')}
                    </p>
                    <p className="text-xs mt-2 leading-relaxed text-[var(--text-secondary)]">
                        {txt(
                            'Quando digitalizas talões, o Feed Center guarda NIF, comerciante e linhas de item com quantidade. O sistema normaliza SKU para comparar preço unitário entre meses e gerar sinal de inflação real por item. Em Definições podes escolher mostrar ou ocultar estes insights.',
                            'When you scan receipts, Feed Center stores VAT/NIF, merchant, and item lines with quantity. The system normalizes SKUs to compare unit prices across months and generate real item-level inflation signals. In Settings you can show or hide these insights.',
                        )}
                    </p>
                </div>

                <NextActionsStrip
                    title={txt('Quando quiseres, define a tua pagina inicial em Definicoes > Pagina Inicial.', 'Whenever you want, set your start page in Settings > Home Page.')}
                    actions={[
                        { label: txt('Abrir pagina Hoje', 'Open Today page'), to: '/today' },
                        { label: txt('Configurar pagina inicial', 'Configure start page'), to: '/settings' },
                        { label: txt('Ir para tarefas', 'Go to tasks'), to: '/todo' },
                    ]}
                />
            </motion.div>
        </div>
    )
}
