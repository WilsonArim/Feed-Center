# Login e Autenticação - Feed-Center App
## Overview
Fluxo seguro sem wallet connect. Email/senha base, com opções OAuth. Página dedicada com redirect para dashboard pós-login.
## Boas Práticas
- Simplicidade: Forms clean, com "Esqueci senha".
- Segurança: Rate limiting, CAPTCHA se necessário.
- UX: Social logins para speed (Google/Apple).
- Logging: Track attempts sem expor dados.
## Requisitos e Fluxos
- **Métodos**:
- Email + senha (hashed com bcrypt/argon2).
- OAuth (Supabase built-in).
- 2FA opcional (TOTP via app).
- **Fluxo de Login**:
1. Página inicial: Form email/senha + "Registrar".
2. Validação: Client-side + server.
3. Sucesso: JWT token, redirect dashboard.
4. Registro: Email verificação, senha requisitos.
5. Reset: Email token temporário.
- **Sessões**: Refresh tokens, logout invalida.
## Integrações e Considerações
- Backend: Supabase auth completo.
- Frontend: React context para auth state.
- Segurança: OWASP compliance, HTTPS only.
- Escalabilidade: Scalable sessions com Redis.