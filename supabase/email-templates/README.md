# Templates de e-mail — Supabase Auth

Templates em PT-BR com identidade visual da Arena Digital para os e-mails enviados via Supabase Auth + Resend SMTP.

## Templates incluídos

| Arquivo | Supabase | Uso no app |
|---------|----------|------------|
| `confirmation.body.html` | Confirm sign up | Cadastro do gestor (`signUp`) |
| `magic-link.body.html` | Magic link | Login por link (`signInWithOtp`) |
| `recovery.body.html` | Reset password | Esqueci minha senha |
| `invite.body.html` | Invite user | Convite de atleta (`inviteUserByEmail`) |
| `email-change.body.html` | Change email | Alteração de e-mail |
| `reauthentication.body.html` | Reauthentication | Verificação de identidade |

Layout compartilhado em `_shell.html` (logo, cores navy `#002b40` + laranja `#ff6b00`).

## Aplicar automaticamente (recomendado)

Pré-requisito: Supabase CLI autenticado (`supabase login`).

```bash
pnpm email-templates:apply
```

O script renderiza os HTMLs e executa `supabase config push` usando `supabase/config.toml`.

**Atenção:** o `config.toml` contém também settings de auth (site_url, redirect URLs, etc.). Não altere valores de produção sem intenção.

## Aplicar manualmente no painel

1. Supabase → **Authentication** → **Email Templates**
2. Para cada template, copie o **assunto** e o **HTML completo** (shell + body)
3. Para montar o HTML manualmente: conteúdo de `*.body.html` dentro de `_shell.html`, substituindo `{{CONTENT}}`

### Assuntos

| Template | Assunto |
|----------|---------|
| Confirm sign up | `Confirme seu e-mail — Arena Digital` |
| Magic link | `Seu link de acesso — Arena Digital` |
| Reset password | `Redefinir senha — Arena Digital` |
| Invite user | `Você foi convidado — Arena Digital` |
| Change email | `Confirmar novo e-mail — Arena Digital` |
| Reauthentication | `{{ .Token }} — código de verificação Arena Digital` |

## Variáveis disponíveis

- `{{ .ConfirmationURL }}` — link de ação (confirmar, entrar, resetar)
- `{{ .Token }}` — código OTP de 6 dígitos
- `{{ .Email }}` — e-mail do usuário
- `{{ .NewEmail }}` — novo e-mail (change email)
- `{{ .Data.firstName }}` — nome do metadata (cadastro/convite)

## Checklist pós-aplicação

- [ ] Resend: click/open tracking **desligado**
- [ ] Supabase SMTP: sender `no-reply@arenadigital.app`
- [ ] Testar cadastro com e-mail externo
- [ ] Testar "Esqueci minha senha"
- [ ] Testar login por link
- [ ] Testar convite de atleta
