interface CategoryLabel {
    pt: string
    en: string
    aliases?: string[]
}

const CATEGORY_LABELS: CategoryLabel[] = [
    { pt: 'Alimentação', en: 'Food', aliases: ['Alimentacao'] },
    { pt: 'Transporte', en: 'Transport' },
    { pt: 'Saúde', en: 'Health', aliases: ['Saude'] },
    { pt: 'Habitação', en: 'Housing', aliases: ['Habitacao'] },
    { pt: 'Lazer', en: 'Leisure' },
    { pt: 'Educação', en: 'Education', aliases: ['Educacao'] },
    { pt: 'Subscriptions', en: 'Subscriptions' },
    { pt: 'Outros', en: 'Other' },
    { pt: 'Salário', en: 'Salary', aliases: ['Salario'] },
    { pt: 'Freelance', en: 'Freelance' },
    { pt: 'Investimentos', en: 'Investments' },
    { pt: 'Reembolso', en: 'Refund' },
    { pt: 'Renda', en: 'Rent' },
    { pt: 'Eletricidade', en: 'Electricity' },
    { pt: 'Gás', en: 'Gas', aliases: ['Gas'] },
    { pt: 'Água', en: 'Water', aliases: ['Agua'] },
    { pt: 'Internet', en: 'Internet' },
    { pt: 'Seguro', en: 'Insurance' },
    { pt: 'Telecomunicações', en: 'Telecommunications', aliases: ['Telecomunicacoes'] },
    { pt: 'Despesas', en: 'Expenses' },
]

const normalize = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()

const lookup = new Map<string, CategoryLabel>()

for (const label of CATEGORY_LABELS) {
    lookup.set(normalize(label.pt), label)
    lookup.set(normalize(label.en), label)
    for (const alias of label.aliases ?? []) {
        lookup.set(normalize(alias), label)
    }
}

export function localizeFinancialCategory(category: string, isEnglish: boolean): string {
    const match = lookup.get(normalize(category))
    if (!match) return category
    return isEnglish ? match.en : match.pt
}
