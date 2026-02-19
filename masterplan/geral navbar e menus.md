# Navegação e Menus - Feed-Center App
## Overview
Sistema híbrido: Navbar top para ações globais, Sidebar left para módulos específicos. Deve ser collapsível em mobile, com ícones intuitivos e search global.
## Boas Práticas
- Consistência: Mesmos estilos cross-app (ex: hover effects).
- Performance: Lazy load menus dinâmicos.
- Acessibilidade: Keyboard nav, screen reader support (ex: aria-labels).
- Customização: Allow user to pin items na sidebar.
## Requisitos e Fluxos
- **Navbar Top**:
- Logo/Home link.
- Search bar (cross-módulos).
- Notificações bell.
- User avatar (dropdown: settings, logout).
- **Sidebar Left**:
- Itens fixos: Dashboard, Calendário, etc. (expansível).
- Sub-menus: Para crypto (ex: Ledger, Pools).
- Footer: Versão app, help link.
- **Fluxo de Uso**:
1. Desktop: Sidebar sempre visível.
2. Mobile: Hamburger menu toggle.
3. Navegação: Links com transições suaves (ex: React Router).
4. Ativos: Highlight item atual.
## Integrações e Considerações
- Frontend: React Router para routing, Material-UI para components.
- Backend: Role-based menus (ex: admin extras).
- Segurança: Proteja rotas sensíveis (ex: auth guards).
- Escalabilidade: Dynamic menus via API para features futuras.