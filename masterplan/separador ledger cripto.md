# Crypto Geral - Feed-Center App
## Overview
Base para features crypto: APIs read-only, sem custódia. Foco em tracking via addresses públicos, preços real-time.
## Boas Práticas
- Segurança: Nunca keys, só publics.
- Performance: Cache prices (Redis), polling/WebSockets.
- UX: Charts interativos, alerts preço.
- Compliance: Disclaimers "Não financeiro advice".
## Requisitos e Fluxos
- **APIs Base**:
- Moralis/Helius: Balances, txs via address.
- CoinGecko: Prices, market data.
- Dexscreener: Pools info.
- **Fluxo Geral**:
1. User input address (validado).
2. Fetch inicial: Balances, history recente.
3. Display: Dashboard com cards (ex: total value).
4. Updates: Manual ou hash-based (híbrido).
5. Sub-separadores: Dashboard, Portfolio carteira, DEFI
## Integrações e Considerações
- Backend: Proxy calls para evitar CORS.
- Frontend: Chart.js para visuals.
- Segurança: Encripte user inputs no DB.
- Escalabilidade: Suporte multi-chain (EVM/Solana).