# Controlo Financeiro - Feed-Center App
## Overview
Módulo para tracking de gastos, vencimentos e orçamento, integrado com crypto ledger. Foco em simplicidade para novatos, com dashboards visuais para reduzir ansiedade. Queixas comuns: apps bloated com features desnecessárias, risco em conectar bancos, entry manual tedioso, dinheiro espalhado em múltiplos apps, lentidão em resoluções, OCR impreciso em receipts ruins, categorização errada, fricção em uploads. Usuários querem: visualizações instantâneas (ex: "Spent X, Saved Y"), categorização auto sem riscos, acesso fácil para low-income, integração seamless, snap/upload com OCR AI para extrair merchant/categoria e add auto a gastos.
## Boas Práticas (SOTA 2026)
- AI para categorização auto (sem ler SMS/emails), privacy-focused com upload de statements.
- Dashboards color-coded, month comparisons, anxiety-reducing (ex: focus em "Can I afford?").
- Integração com Account Aggregator-like systems para dados padronizados, sem custódia.
- Weekly summaries, micropayments simulation, high-interest suggestions para low-income.
- Evite fricção: one-click entry, auto-sync sem bancos conectados.
- OCR SOTA: Combine OCR (ex: Tesseract/Google Vision) com AI para 97-99% accuracy; pre-processing (correção orientação, contraste); auto-extract merchant, data, amount, categoria (farmácia, comida); add instantâneo a gastos diários; tips para fotos (boa luz, flat surface); fallback manual se falhar.
## Requisitos e Fluxos
- **Features Chave**:
- Categorias custom (gastos/vencimentos), budgets mensais.
- Visuals: Pie charts, trends, PNL simples ligado a crypto.
- Alerts: Lembretes vencimentos, over-spend warnings.
- Export: CSV/PDF reports.
- OCR Upload: Tirar foto/carregar ficheiro → AI extrai merchant (empresa), categoria (farmácia/comida/bens), amount/data → add auto a gastos diários; validação quick (edit se errado).
- **Fluxo de Uso**:
1. Dashboard inicial: Instant view de saldo, gastos recentes.
2. Add entry: Manual (qty, data, categoria) ou upload statement para auto.
3. OCR Fluxo: Snap/upload receipt → process AI (extract + categorize) → preview/add to daily → sync com budgets/alerts.
4. Update: Sync com to-do para tasks financeiras.
5. Análise: AI sugere otimizações (ex: "Cut category X").
## Integrações e Considerações
- Backend: Supabase para storage encriptado, APIs como ExchangeRates para moedas; cloud OCR (AWS Textract/Google Vision) para process.
- Frontend: Chart.js para visuals, Formik para entries; camera API para snap.
- Segurança: Dados encriptados, GDPR export/delete; process OCR client-side/local para privacidade.
- Escalabilidade: AI local para categorização offline, sync com crypto module.