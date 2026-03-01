# 🛡️ LOCKVAULT.md — Diretiva de Segurança Zero-Knowledge

> A cloud é uma parede cega. Recebe caixas trancadas, guarda-as, e devolve-as quando pedido. Nunca tem a chave.

---

## Filosofia Central: Arquitetura Fort Knox

O Feed Center opera sob política estrita de **Zero-Knowledge (ZK) + Zero-Trust**.
O servidor cloud (Supabase) é um "disco rígido cego e burro" — **nunca** recebe, processa ou armazena texto em claro, master passwords ou private keys.

Toda a inteligência vive na máquina local (`server/`). Toda a persistência na cloud é cifrada antes de sair da RAM.

---

## Os 6 Pilares da Fortaleza

### Pilar I — Chaves Fundidas ao Hardware (Secure Enclave)

| Regra | A master key nasce e morre dentro do hardware do dispositivo |
|---|---|
| **API** | WebAuthn / Passkeys |
| **Execution** | Chaves geradas no TEE (Trusted Execution Environment) do dispositivo |
| **Proibido** | Guardar private keys em `localStorage`, `sessionStorage`, cookies, ou bases de dados não-cifradas |

> O utilizador **é** a chave. Sem o dispositivo físico, o vault não abre.

---

### Pilar II — Sincronização Assimétrica (Modelo do Cadeado Aberto)

| Regra | Dados roam entre dispositivos sem a private key viajar pela rede |
|---|---|
| **Modelo** | Public-Key Cryptography (RSA/ECC + PQC hybrid) |

**Fluxo de sincronização:**

```
Dispositivo A                    Supabase                     Dispositivo B
     │                              │                              │
     │── gera KeyPair(Pub/Priv) ──→ │                              │
     │   (Priv fica no Enclave)     │                              │
     │── partilha PubKey ──────────→│                              │
     │                              │←── novo login, publica PubB ─│
     │←── recebe PubB ─────────────│                              │
     │                              │                              │
     │── cifra payload com PubB ──→ │── relay cego ──────────────→ │
     │                              │                              │── decifra com PrivB
     │                              │                              │   (no Enclave)
```

> O Supabase é um **correio cego**: transporta envelopes selados, nunca lê o conteúdo.

---

### Pilar III — Higiene de Memória Volátil (RAM Safety)

| Regra | Dados decifrados existem em RAM apenas no milissegundo em que são usados |
|---|---|

**Protocolo de limpeza:**

1. **Sem swap para disco** — usar secure memory allocation onde disponível
2. **Zeroing agressivo** — ao desmontar componente ou concluir função, sobreescrever o buffer com zeros via `crypto.getRandomValues()` antes do garbage collector atuar
3. **Lifecycle hooks** — no React, limpar no `useEffect` cleanup; no Node, limpar no `finally`

```typescript
// Padrão de limpeza
const decrypted = new Uint8Array(decrypt(ciphertext))
try {
    processSecret(decrypted)
} finally {
    crypto.getRandomValues(decrypted) // zeroing
}
```

---

### Pilar IV — Prontidão Pós-Quântica (PQC)

| Regra | Defender contra ataques "Harvest Now, Decrypt Later" |
|---|---|
| **Standard** | NIST FIPS 203 (ML-KEM), FIPS 204, FIPS 205 |
| **Estratégia** | Criptografia Híbrida — envolver ECC/RSA existente com camada PQC |

> Se um adversário capturar o tráfego cifrado hoje, não poderá decifrá-lo com computação quântica amanhã.

---

### Pilar V — Resiliência Quântica-IA (Encriptação Polimórfica)

| Regra | Uma defesa estática falha contra ataque quântico otimizado por IA |
|---|---|
| **Estratégia** | Moving Target Defense — rotação automática de chaves simétricas |

**Mecânica:**

- Chaves simétricas rotam em intervalos aleatórios ou triggers de lifecycle
- O vault é re-wrapped silenciosamente com a nova chave
- Se um atacante capturar o ciphertext, quando começar a decifrar, o vault já mutou

---

### Pilar VI — Fragmentação de Dados (Shamir's Secret Sharing)

| Regra | O atacante não pode decifrar o que não consegue montar |
|---|---|
| **Protocolo** | Shamir's Secret Sharing (SSS) — dividir ciphertext em `n` fragmentos, threshold `k` para reconstruir |

**Distribuição:**

| Fragmento | Localização |
|---|---|
| Shard 1 | Supabase (transit table, cifrado) |
| Shard 2 | IndexedDB local (browser) |
| Shard 3 | Secure Enclave state (dispositivo) |

> O ciphertext completo só é montado em RAM volátil, no momento exato da decifração, e depois é zerado.

---

## Regras Operacionais para Developers

1. **Auditoria de cada `fetch`:** Antes de escrever qualquer chamada de rede, verificar: "O payload está cifrado com a public key do destino?" Se não → **não escrever o código**
2. **Rejeitar bibliotecas que quebrem E2EE:** Se uma lib forçar envio de dados em claro, rejeitá-la e propor wrapper criptográfico custom
3. **Logs sanitizados:** Nunca logar dados decifrados, tokens, ou chaves. Usar hashes truncados para debugging
4. **Testes de segurança:** Cada novo service que toque em dados sensíveis precisa de teste que valide que nenhum plaintext sai da máquina local

---

## Aplicação nos Pilares do AGENTS.md

| Pilar AGENTS.md | Pilar LOCKVAULT |
|---|---|
| **III — Enclave Soberano** | Pilares I + II + III + VI — o raciocínio e dados brutos **nunca** vão para cloud |
| **IV — Agência Silenciosa** | Pilar III — dados decifrados só vivem em RAM durante o handshake |
| **I — Interface Fantasma** | Sem modais de segurança — consentimento via Buggy ambient (TTS/Draft Node) |

---

> Se a segurança parece visível ao utilizador, está mal desenhada. O Fort Knox não tem porta da frente — ele **é** a porta.
