# To-Do - Feed-Center App
## Overview
Módulo para tarefas diárias, integrado com calendário/financeiro/crypto. Queixas: UI bloated, tasks não destacadas, falta de sync/notifications, quick create lento, over-complexidade, não limpa tasks velhas. Usuários querem: Tasks centrados/visuais, AI para priority/plans/auto-clean, quick create (voice/text), sync PC/mobile, integração com money/calendar, levels (list vs manager vs projects).
## Boas Práticas (SOTA 2026)
- Distinguir levels: Simple lists para capture, managers para execute, projects para reviews AI semanais.
- AI para sugestões (group tasks, prioritize), auto-archive.
- Keyboard shortcuts, voice-to-text, notifications push.
- Visual centering: Tasks bold/colorful, Kanban boards.
- Integração real: Tasks auto de financeiro (ex: "Pay bill").
## Requisitos e Fluxos
- **Features Chave**:
- Priorities, subtasks, due dates.
- Grouping AI, weekly reviews.
- Notes/attachments, voice input.
- **Fluxo de Uso**:
1. Quick create: 1-2 taps/voice.
2. Prioritize: AI sugere order.
3. Complete: Auto-sync com calendário/financeiro.
4. Review: AI limpa/sugere plans.
## Integrações e Considerações
- Backend: Supabase realtime para sync.
- Frontend: React Kanban libs, speech-to-text API.
- Segurança: Tasks encriptadas se sensíveis.
- Escalabilidade: AI local para reviews offline, multi-device sync.