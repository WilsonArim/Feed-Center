# Roadmap Tecnico: SaaS Invertido — Soberania como Servico

> Baseado na tese: `tese soberania as a service.md`
> Data: 2026-03-01

---

## Fase 1: Split-Key Encryption (Zero-Knowledge Storage)

### Objectivo
O Supabase armazena apenas "lixo matematico" — blobs cifrados impossíveis de ler sem o dispositivo local do utilizador.

### Arquitectura de Chaves

```
K_local  (dispositivo)  ─┐
                          ├─ XOR ──> K_op (chave operacional, em memória volátil)
K_cloud  (Supabase)     ─┘
                                    │
                                    ▼
                          AES-256-GCM encrypt/decrypt
```

### Implementacao

#### 1.1 Geracao de K_local (Browser — Web Crypto API)

```typescript
// Gerar K_local no primeiro login — armazenar no IndexedDB como CryptoKey nao-exportavel
const K_local = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false — XSS nao consegue extrair
    ['encrypt', 'decrypt']
)

// Armazenar no IndexedDB (NAO no localStorage — vulneravel a XSS)
const db = await openDB('sovereignty', 1, {
    upgrade(db) { db.createObjectStore('keys') }
})
await db.put('keys', K_local, 'K_local')
```

#### 1.2 Geracao de K_cloud (Supabase)

```typescript
// Gerar K_cloud como raw bytes e armazenar no Supabase (via RLS — row do user)
const K_cloud_raw = crypto.getRandomValues(new Uint8Array(32))

await supabase.from('user_keys').upsert({
    user_id: user.id,
    k_cloud: btoa(String.fromCharCode(...K_cloud_raw)),
})
```

#### 1.3 Reconstrucao de K_op (em memoria volatil)

```typescript
// Derivar K_op = K_local_raw XOR K_cloud_raw
// Como K_local nao e exportavel, usamos uma abordagem HKDF:
// Em vez de XOR directo, derivamos K_op via HKDF com K_local como base
// e K_cloud como salt — resultado equivalente em seguranca

const K_op = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: K_cloud_raw, info: new TextEncoder().encode('sovereignty') },
    K_local_hkdf_base, // importado como 'HKDF' base key
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
)
```

**Nota tecnica:** O XOR puro requer exportar os raw bytes de K_local, o que contradiz `extractable: false`. A alternativa segura e usar HKDF (derivacao de chave baseada em HMAC) com K_local como material base e K_cloud como salt. O resultado e criptograficamente equivalente: sem ambos os componentes, K_op e irrecuperavel.

#### 1.4 Encrypt/Decrypt com AES-256-GCM

```typescript
async function encryptRecord(data: object, K_op: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = new TextEncoder().encode(JSON.stringify(data))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, K_op, plaintext)
    return {
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    }
}

async function decryptRecord(record: { iv: string; ciphertext: string }, K_op: CryptoKey): Promise<object> {
    const iv = Uint8Array.from(atob(record.iv), c => c.charCodeAt(0))
    const data = Uint8Array.from(atob(record.ciphertext), c => c.charCodeAt(0))
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, K_op, data)
    return JSON.parse(new TextDecoder().decode(decrypted))
}
```

#### 1.5 Migracao da BD Supabase

```sql
-- Nova tabela para dados cifrados (substitui campos em texto limpo)
ALTER TABLE financial_entries ADD COLUMN encrypted_blob TEXT;
ALTER TABLE financial_entries ADD COLUMN encryption_iv TEXT;
ALTER TABLE financial_entries ADD COLUMN encrypted_at TIMESTAMPTZ;

-- Tabela de chaves cloud por utilizador
CREATE TABLE user_keys (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    k_cloud TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: cada user so acede a sua chave
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_key" ON user_keys
    FOR ALL USING (auth.uid() = user_id);
```

#### 1.6 Trade-off: Pesquisa pos-encriptacao

Com dados cifrados, SQL queries como `WHERE merchant ILIKE '%cafe%'` deixam de funcionar. Solucoes:

| Estrategia | Complexidade | Privacidade |
|---|---|---|
| **Decrypt no frontend + filtro em memoria** | Baixa | Total |
| **Searchable encryption (HMAC tags)** | Media | Parcial (leaks patterns) |
| **Homomorphic encryption** | Alta | Total (mas lento) |

**Recomendacao:** Fase 1 usa decrypt-no-frontend. Para datasets < 10K registos (financas pessoais), a latencia e aceitavel (< 200ms para decrypt + filter de 5000 records com AES-GCM em hardware moderno).

---

## Fase 2: BIP-39 Recovery (Heranca Web3)

### Objectivo
Se o dispositivo e perdido, o utilizador recupera K_local a partir de 12-24 palavras escritas em papel.

### Implementacao

```typescript
import { generateMnemonic, mnemonicToSeed } from 'bip39'

// 1. No setup inicial — gerar mnemonic
const mnemonic = generateMnemonic(128) // 12 palavras, 128 bits de entropia
// Mostrar ao user: "apple globe ribbon zebra ..."
// User anota num papel fisico

// 2. Derivar K_local a partir do mnemonic
const seed = await mnemonicToSeed(mnemonic)
const K_local_raw = seed.slice(0, 32) // Primeiros 256 bits

const K_local = await crypto.subtle.importKey(
    'raw', K_local_raw,
    { name: 'AES-GCM' },
    false, // nao exportavel — uma vez importado, fica preso ao browser
    ['encrypt', 'decrypt']
)

// 3. Recuperacao: user insere as 12 palavras num novo dispositivo
// O sistema regenera K_local, vai ao Supabase buscar K_cloud,
// e todos os dados sao desbloqueados
```

### UX de Recuperacao

```
[Setup Inicial]
    "Anote estas 12 palavras. Sao a sua unica forma de recuperar os dados."
    ┌──────────────────────────────────────────┐
    │  1. apple    2. globe    3. ribbon       │
    │  4. zebra    5. ocean    6. bridge       │
    │  7. silver   8. mountain 9. sunset       │
    │  10. garden  11. crystal 12. forest      │
    └──────────────────────────────────────────┘
    [Ja anotei — Confirmar]

[Recuperacao]
    "Insira as suas 12 palavras de recuperacao:"
    [___] [___] [___] [___] [___] [___]
    [___] [___] [___] [___] [___] [___]
    [Recuperar Dados]
```

---

## Fase 3: Cloudflare Tunnels (O Cerebro Local)

### Objectivo
Conectar o frontend Vercel ao cortex local (Mac com Ollama/Qwen) sem abrir portas no router.

### Arquitectura

```
[Browser] ──HTTPS──> [Vercel Frontend]
                            │
                            │ CF-Access-Client-Id + CF-Access-Client-Secret
                            ▼
                     [Cloudflare Edge]
                            │
                            │ Tunel outbound encriptado (443)
                            ▼
                     [cloudflared daemon] (Mac local)
                            │
                            │ 127.0.0.1:11434
                            ▼
                     [Ollama + Qwen] (O Cerebro)
                            │
                            │ 127.0.0.1:3001
                            ▼
                     [Express cortexRouter] (Backend local)
```

### Setup (< 5 minutos)

```bash
# 1. Instalar cloudflared
brew install cloudflared

# 2. Autenticar
cloudflared tunnel login

# 3. Criar tunel
cloudflared tunnel create feed-center-brain

# 4. Configurar rota (~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: brain.yourdomain.com
    service: http://localhost:3001
  - hostname: ollama.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404
EOF

# 5. Criar DNS
cloudflared tunnel route dns feed-center-brain brain.yourdomain.com
cloudflared tunnel route dns feed-center-brain ollama.yourdomain.com

# 6. Correr o tunel
cloudflared tunnel run feed-center-brain
```

### Seguranca: Service Tokens (Zero Trust)

```bash
# No dashboard Cloudflare Access:
# 1. Criar Application → Self-hosted → brain.yourdomain.com
# 2. Criar Service Token → Copiar Client-ID e Client-Secret
# 3. Adicionar Policy: "Allow" se Service Token valido
```

No Vercel, injectar como env vars:
```
CF_ACCESS_CLIENT_ID=xxxxxxxxxx
CF_ACCESS_CLIENT_SECRET=yyyyyyyyyyyy
CORTEX_TUNNEL_URL=https://brain.yourdomain.com
```

No frontend, os requests ao cortex incluem os headers:
```typescript
const response = await fetch(`${CORTEX_TUNNEL_URL}/cortex/route`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET,
    },
    body: JSON.stringify(payload),
})
```

---

## Fase 4: 1-Click Deploy (Fork + Vercel)

### Objectivo
Qualquer pessoa clica num botao, faz fork do repo para a sua conta GitHub, e faz deploy na Vercel com as suas proprias credenciais.

### Implementacao

#### 4.1 Botao Deploy

No README.md do repositorio:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourorg%2Ffeed-center&env=SUPABASE_URL,SUPABASE_ANON_KEY,OPENAI_API_KEY,CF_ACCESS_CLIENT_ID,CF_ACCESS_CLIENT_SECRET,CORTEX_TUNNEL_URL&envDescription=Configure%20your%20sovereign%20instance&project-name=my-feed-center)
```

#### 4.2 Sanitizar o repo para fork

Antes de publicar, garantir:

- [ ] Remover todos os `.env*` do tracking (ja no `.gitignore`)
- [ ] Substituir URLs hardcoded por env vars
- [ ] Remover dados pessoais de seeds/fixtures
- [ ] Adicionar `CLAUDE.md` generico (sem instrucoes pessoais)
- [ ] Schema SQL como migration Supabase (nao inline)

#### 4.3 Fluxo do utilizador

```
1. User clica "Deploy to Vercel"
2. Vercel faz fork automatico para a conta GitHub do user
3. Formulario pede: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, etc.
4. Deploy automatico → app online em < 2 min
5. User instala cloudflared no Mac → configura tunel
6. App conecta ao cerebro local via Cloudflare Tunnel
7. Setup BIP-39: user anota 12 palavras → soberania completa
```

---

## Cronograma de Execucao

| Fase | Estimativa | Dependencias |
|---|---|---|
| **Fase 1:** Split-Key Encryption | Sprint 1 | Web Crypto API, Supabase migration |
| **Fase 2:** BIP-39 Recovery | Sprint 1 | `bip39` npm package |
| **Fase 3:** Cloudflare Tunnels | Sprint 2 | Cloudflare account, dominio |
| **Fase 4:** 1-Click Deploy | Sprint 2 | Repo publico, env var cleanup |

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| User perde mnemonic + dispositivo | Perda total de dados | UI agressiva de backup; verificacao periodica "Ainda tens as 12 palavras?" |
| XSS extrai K_local do IndexedDB | Compromisso da chave | `extractable: false` no CryptoKey; CSP headers rigorosos |
| Cloudflare como MitM (TLS termination na edge) | Exposicao de dados em transito | Dados ja cifrados client-side antes de chegar ao tunel |
| Latencia decrypt-no-frontend com datasets grandes | UX degradada | Paginacao; decrypt lazy; Web Workers para decrypt off-main-thread |
| Supabase downtime bloqueia acesso a K_cloud | App inacessivel | Cache local encriptado de K_cloud com TTL (refresh periodico) |
