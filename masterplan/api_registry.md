# API Registry — Feed Center

Lista de todas as APIs utilizadas ou necessárias no projeto.

---

## ✅ APIs Configuradas

| API | Env Var | Status | Uso | Plano |
|---|---|---|---|---|
| **Supabase** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | ✅ Ativo | Auth, DB, RLS | Free |
| **Supabase Service Role** | `SUPABASE_SERVICE_ROLE_KEY` | ✅ Ativo | Bypass RLS (server-side) | Free |
| **CoinGecko** | — (sem key) | ✅ Ativo | Token search, preços, 24h change | Free (30 req/min) |
| **DexScreener** | — (sem key) | ✅ Ativo | Pool/LP data, DEX pairs | Free |
| **OpenAI** | `VITE_OPENAI_API_KEY` | ✅ Ativo | Copilot Buggy (análise de tx hash) | Pay-as-you-go |

## ⚠️ APIs Expiradas (removidas do fluxo principal)

| API | Env Var | Status | Uso Original |
|---|---|---|---|
| **Helius** | `VITE_HELIUS_API_KEY` | ⚠️ Pode renovar | Solana RPC (balances, SPL tokens) |
| **Moralis** | `VITE_MORALIS_API_KEY` | ❌ Expirada | EVM multi-chain balances |

## 🔮 APIs Futuras (não configuradas)

| API | Para quê | Prioridade |
|---|---|---|
| **Solscan** | Auto-parse tx hash Solana | Média |
| **Etherscan** | Auto-parse tx hash EVM | Média |
| **Google Vision** | OCR de screenshots de transações | Baixa |
| **Google Cloud** | Possível backend functions | Baixa |
