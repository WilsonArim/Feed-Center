# Theme e Aparência - Feed-Center App
## Overview
Suporte dark/light/auto (baseado em OS). Aplicado globalmente via CSS variables, com switch em settings.
## Boas Práticas
- Performance: No overhead (use media queries para auto).
- Consistência: Teste em todos components (ex: charts crypto).
- Acessibilidade: High-contrast options.
- Custom: User-defined colors se premium.
## Requisitos e Fluxos
- **Modos**:
- Dark: Cores escuras para low-light.
- Light: Default claro.
- Auto: Detect via window.matchMedia.
- **Fluxo de Uso**:
1. Settings: Toggle switch.
2. Aplicar: Update root CSS vars.
3. Persist: Salve em DB/user prefs.
4. Preview: Instantâneo na página settings.
## Integrações e Considerações
- Frontend: Styled-components ou Tailwind com theme support.
- Backend: Sync prefs cross-device.
- Segurança: N/A, mas evite storage sensível.
- Escalabilidade: Easy extensível para mais themes.