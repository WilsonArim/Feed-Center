# Definições (Settings Page) - Feed-Center App
## Overview
Página central para personalização do usuário, acessível via ícone de perfil ou menu. Deve ser intuitiva, com tabs/seções para organização. Foco em persistência de dados (salvos no DB por user) e updates em tempo real sem refresh.
## Boas Práticas
- Persistência: Use localStorage para previews, mas salve no backend (Supabase) para sync cross-device.
- Validações: Inputs com checks (ex: senha min 8 chars, email válido).
- Responsividade: Mobile-friendly com accordions para seções longas.
- Acessibilidade: Labels ARIA, focus traps.
## Requisitos e Fluxos
- **Seções Principais**:
- Conta: Alterar email (com verificação), senha (confirmação antiga/nova), ativar 2FA.
- Aparência: Tema (dark/light/auto), tamanho de fonte, high-contrast mode.
- Moeda: Default currency ($/€/BTC) para displays financeiros.
- Linguagem: Seleção (pt-pt, pt-br, en-us, fr, de) com i18n lib.
- Notificações: Toggle email/push para alerts gerais.
- Privacidade: Exportar/deletar dados, consentimentos GDPR.
- **Fluxo de Uso**:
1. User acessa via menu.
2. Altera setting (ex: tema) → preview imediato.
3. Salva → API call para backend, feedback toast.
4. Erro: Mensagem clara (ex: "Senha inválida").
## Integrações e Considerações
- Backend: Supabase auth para conta, custom tables para prefs.
- Frontend: React forms com Formik/Yup para validação.
- Segurança: Encripte prefs sensíveis (ex: 2FA setup).
- Escalabilidade: Cache settings no client para performance.