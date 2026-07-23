# Plano de Implementação — Agente de IA da Arena (WhatsApp + LLM)

> **Status:** Planejamento (MVP) — Julho/2026
> **Autor:** Planejamento técnico
> **Escopo:** Novo módulo `ai-agent` no `arenadigital-web`
> **Fonte da verdade:** ao implementar, refletir mudanças em `docs/PRD-Web-Gestor.md`, `docs/SPEC-Web-Gestor.md` e `DATABASE_ARCHITECTURE.md`.

---

## 1. Visão Geral

Conectar um número de WhatsApp a uma conta de Arena. Quando um cliente enviar mensagem para esse número, um **Agente de IA** (LLM de baixo custo) entende o contexto, conversa em linguagem natural e responde dúvidas **restritas ao escopo da Arena vinculada**:

- Horário de funcionamento da Arena;
- Quadras/espaços disponíveis e suas modalidades;
- Valores de reserva **avulsa** e **mensal** (mensalista);
- Disponibilidade de quadras por **dia e horário**.

Regras estruturais:
- Um número de WhatsApp pertence a **exatamente uma** Arena (vínculo único e validado).
- O gestor pode **ligar/desligar** o agente e definir um **prompt de personalidade** próprio da sua Arena.
- Integrações externas: **Meta (WhatsApp Business Cloud API)** para mensageria e **OpenAI (ChatGPT)** para a camada conversacional/entendimento de contexto.

### 1.1 Escopo do MVP (in)
- Recepção e resposta automática de mensagens de **texto** e de **áudio** no WhatsApp.
  - Áudio (mensagens de voz/PTT) é **transcrito** para texto (speech-to-text) e tratado como uma pergunta textual; a resposta do agente é enviada em texto.
- 4 capacidades de consulta acima (somente leitura, sempre com dados reais do banco).
- Setup na área do gestor: conectar número, validar, definir persona, ligar/desligar.
- Escopo de dados isolado por Arena e observabilidade/custos básicos.

### 1.2 Fora do escopo do MVP (out)
- **Interpretação de imagem e vídeo** (tratar como "não suportado" com resposta padrão).
- Efetuar reservas/cobranças pelo chat (apenas informar; reserva continua no app/web).
- Resposta em áudio (text-to-speech) — o agente entende áudio, mas **responde sempre em texto**.
- Figurinhas, documentos, localização (tratar como "não suportado" com resposta padrão).
- Mensagens proativas/campanhas (templates de marketing) e envio ativo.
- Handoff humano automatizado com fila (apenas mensagem de fallback no MVP).
- Multi-idioma (apenas pt-BR no MVP).

---

## 2. Requisitos

### 2.1 Requisitos Funcionais (RF)
- **RF-01** — Gestor conecta o número de WhatsApp da Arena por um fluxo de onboarding seguro (Meta Embedded Signup).
- **RF-02** — O sistema valida a posse do número (via Meta) e cria vínculo **único** número → Arena.
- **RF-03** — Um número já vinculado a uma Arena não pode ser vinculado a outra (constraint + validação de aplicação).
- **RF-04** — Gestor define o **prompt de personalidade** do agente da sua Arena.
- **RF-05** — Gestor **liga/desliga** o agente a qualquer momento (com agente desligado, nenhuma resposta é gerada).
- **RF-06** — Ao receber mensagem, o agente identifica a Arena pelo `phone_number_id` e responde **apenas** com dados dessa Arena.
- **RF-06.1** — O agente processa mensagens de **texto** e de **áudio**. Para áudio, baixa a mídia do Meta, transcreve para texto (speech-to-text) e segue o mesmo fluxo de uma pergunta textual.
- **RF-06.2** — Mensagens de **imagem, vídeo** e outros tipos não suportados recebem resposta padrão informando a limitação (não são interpretadas).
- **RF-07** — Agente responde horário de funcionamento da Arena.
- **RF-08** — Agente responde quadras/espaços e modalidades da Arena.
- **RF-09** — Agente responde valores de reserva avulsa e mensal.
- **RF-10** — Agente responde disponibilidade de quadra por dia/horário cruzando grade (`day_config`) com reservas (`bookings`).
- **RF-11** — Fora do escopo, o agente responde com fallback educado ("posso chamar um atendente / esse assunto eu ainda não consigo resolver").
- **RF-12** — Gestor visualiza status da conexão (conectado, número, última atividade) e pode desconectar.
- **RF-13** — Histórico de conversas/mensagens é registrado por Arena (para auditoria e contexto).

### 2.2 Requisitos Não-Funcionais (RNF)
- **RNF-01 Isolamento/segurança** — nenhuma consulta pode vazar dados de outra Arena; `arena_id` sempre derivado do canal, nunca do texto/LLM.
- **RNF-02 Verificação de webhook** — validar assinatura `X-Hub-Signature-256` (App Secret) e `verify_token` no handshake.
- **RNF-03 Idempotência** — cada evento/mensagem do Meta é processado uma única vez (dedupe por `wa_message_id`).
- **RNF-04 Baixo custo** — modelo econômico (`gpt-4o-mini` como padrão), janela de contexto truncada, cache de dados estáticos, teto de uso por Arena.
- **RNF-05 Latência/ACK** — responder `200` ao Meta rapidamente e processar a IA de forma assíncrona (evitar timeout serverless).
- **RNF-06 Segredos** — tokens de acesso por Arena guardados cifrados (nunca em texto puro acessível por RLS permissiva).
- **RNF-07 Assinatura ativa** — agente só responde se a Arena tiver assinatura ativa e o agente habilitado.
- **RNF-08 Observabilidade** — log de eventos, mensagens, tokens/custo e erros; auditoria em `audit_logs`.
- **RNF-09 Resiliência** — falha na LLM/Meta não derruba o webhook; retentativas controladas e status de erro persistido.
- **RNF-10 LGPD** — dados de contato do cliente tratados com finalidade definida; retenção configurável; opt-out.

### 2.3 Pré-requisitos externos (bloqueadores de negócio)
- **PR-01** — App na **Meta for Developers** com produto WhatsApp; **verificação de negócio** (Business Verification).
- **PR-02** — Configuração como **Tech Provider / Solution Partner** para usar Embedded Signup multi-tenant.
- **PR-03** — Permissões `whatsapp_business_messaging` e `whatsapp_business_management` (App Review para Advanced Access em produção).
- **PR-04** — Conta e billing da **OpenAI**; chave de API; limites de gasto.
- **PR-05** — Política de privacidade pública e termos de uso do agente (exigência da Meta).
- **PR-06** — Número(s) de WhatsApp que o cliente irá cadastrar não podem estar ativos em app WhatsApp comum (regra Meta).

---

## 3. Decisões de Arquitetura

| Tema | Decisão MVP | Motivo |
|------|-------------|--------|
| Provedor WhatsApp | **Meta WhatsApp Business Cloud API** | Requisito; hospedado pela Meta, sem infra própria. |
| Onboarding do número | **Embedded Signup** (Facebook Login for Business) | Cada Arena conecta seu próprio WABA/número com prova de posse via Meta; vínculo seguro. Fallback manual guiado no piloto. |
| Roteamento multi-tenant | Por **`phone_number_id`** no payload do webhook | Um `phone_number_id` mapeia para exatamente uma Arena (mecanismo central de isolamento). |
| LLM | **OpenAI `gpt-4o-mini`** (configurável) | Baixo custo, suporta *function/tool calling*, latência baixa. |
| Transcrição de áudio | **OpenAI Speech-to-Text** (ex.: `whisper-1` / `gpt-4o-mini-transcribe`) | Converte mensagem de voz em texto antes do LLM; mesmo provedor, baixo custo. |
| Entendimento estruturado | **Tool calling** (funções expostas ao modelo) | O modelo interpreta a linguagem natural e chama ferramentas; nós executamos contra o Supabase (leitura, escopo por Arena). |
| Abstração de provedores | Interfaces `IWhatsAppClient` e `ILLMProvider` | Espelha o padrão `gateway` de pagamentos; permite trocar Meta/OpenAI sem reescrever o orquestrador. |
| Processamento | **ACK 200 imediato + processamento assíncrono** (`after()`/fila) | Evita timeout e reentregas do Meta. |
| Persistência | Novas tabelas Supabase + migração SQL idempotente | Segue o padrão do projeto (aplicação manual no SQL Editor). |
| UI | Novo card/aba **"Agente de IA"** no detalhe da Arena | Espelha `ArenaPixSplitSettingsCard`. |

### 3.1 Por que tool calling (e não "colar" tudo no prompt)
Injetar toda a agenda/preços no prompt encareceria e arriscaria alucinação de disponibilidade. Com ferramentas, o modelo decide **o que** perguntar; a **fonte da verdade** é sempre o banco, filtrado por `arena_id` do canal. Disponibilidade nunca é "inventada" — vem do cruzamento `day_config` × `bookings` (mesma lógica já usada no dashboard e no app).

---

## 4. Modelo de Dados (novas tabelas)

Migração idempotente em `supabase/migrations/AAAAMMDD_ai_agent_whatsapp.sql` (aplicar no SQL Editor, padrão do projeto).

### 4.1 `arena_ai_agents` — configuração do agente por Arena
```
id                uuid PK
arena_id          uuid UNIQUE NOT NULL  → arenas(id) on delete cascade
enabled           boolean NOT NULL default false     -- liga/desliga (RF-05)
persona_prompt    text                               -- personalidade (RF-04)
model             text NOT NULL default 'gpt-4o-mini'
temperature       numeric(3,2) default 0.30
max_output_tokens integer default 500
monthly_token_cap integer                            -- teto de custo (RNF-04)
fallback_message  text                               -- mensagem de escape (RF-11)
status            text default 'draft'  check in ('draft','active','paused')
created_by        uuid → users(id)
created_at, updated_at timestamptz
```

### 4.2 `whatsapp_channels` — vínculo número → Arena
```
id                    uuid PK
arena_id              uuid UNIQUE NOT NULL → arenas(id) on delete cascade  -- 1 arena : 1 número (RF-03)
provider              text default 'meta'
phone_number_id       text UNIQUE NOT NULL      -- chave de roteamento (RF-06)
waba_id               text NOT NULL             -- WhatsApp Business Account id
display_phone_number  text                      -- número formatado exibido ao gestor
verified_name         text
access_token_encrypted text NOT NULL            -- token cifrado (RNF-06)
token_expires_at      timestamptz
status                text default 'pending' check in ('pending','connected','error','disconnected')
connected_at          timestamptz
last_inbound_at       timestamptz
created_at, updated_at timestamptz
```
> **Unicidade dupla:** `phone_number_id UNIQUE` **e** `arena_id UNIQUE` garantem "um número, uma conta".

### 4.3 `whatsapp_webhook_events` — idempotência (espelha `payment_webhook_events`)
```
id, provider, provider_event_id UNIQUE, wa_message_id, phone_number_id,
arena_id, event_type, status ('processing'|'processed'|'failed'|'ignored'),
payload jsonb, error_message, attempts, processing_started_at, processed_at,
created_at, updated_at
UNIQUE (provider, wa_message_id)   -- dedupe de mensagem (RNF-03)
```

### 4.4 `whatsapp_conversations` — thread por contato/Arena
```
id, arena_id, channel_id, contact_wa_id, contact_name,
last_message_at, message_count, status ('open'|'idle'|'closed'),
created_at, updated_at
UNIQUE (arena_id, contact_wa_id)
```

### 4.5 `whatsapp_messages` — log de mensagens
```
id, conversation_id, arena_id, direction ('inbound'|'outbound'),
wa_message_id, content text, content_type ('text'|'audio'|'unsupported'),
transcribed_from_audio boolean default false,   -- inbound de áudio transcrito
media_id text,                                   -- id da mídia de áudio no Meta
llm_model, transcription_model,
prompt_tokens, completion_tokens, audio_seconds numeric,
tool_calls jsonb,
status ('received'|'sent'|'delivered'|'failed'), error_message,
created_at
```

### 4.6 RLS
Seguir o padrão atual do projeto (`Allow all for X`) para as tabelas de config/log, **exceto** segredos: `whatsapp_channels.access_token_encrypted` deve ficar protegido — opções: (a) tabela dedicada `whatsapp_channel_secrets` sem policy permissiva (acesso só via service role), ou (b) cifrar em app com `ENCRYPTION_KEY`. **Recomendado:** cifrar em app + manter service-role-only para leitura do token.

---

## 5. Camadas de Código (novo módulo `src/modules/ai-agent`)

```
src/modules/ai-agent/
  types/            agent.types.ts, whatsapp.types.ts
  schemas/          agent-config.schema.ts (zod)
  repositories/     IAgentRepository.ts, SupabaseAgentRepository.ts
                    IWhatsAppChannelRepository.ts, SupabaseWhatsAppChannelRepository.ts
  providers/
    llm/            ILLMProvider.ts, OpenAILLMProvider.ts   -- chat + tool calling + transcrição de áudio
    whatsapp/       IWhatsAppClient.ts, MetaWhatsAppClient.ts -- enviar msg, verificar assinatura, baixar mídia de áudio
  tools/            agent-tools.ts        -- definição + execução das ferramentas
  usecases/         process-inbound-message.usecase.ts
                    connect-whatsapp-channel.usecase.ts
                    send-agent-reply.usecase.ts
  actions/          agentActions.ts       -- server actions (config/toggle/persona/conectar)
  components/       ArenaAiAgentSettingsCard.tsx, ConnectWhatsAppButton.tsx
  lib/              crypto.ts (cifra token), meta-signature.ts (verify webhook)

src/app/api/whatsapp/
  webhook/route.ts          -- GET (handshake) + POST (inbound), verify + idempotência + ACK
  embedded-signup/route.ts  -- troca de code/token do Embedded Signup (server-side)
```

### 5.1 Ferramentas expostas ao LLM (todas recebem `arena_id` do canal — nunca do modelo)
- `get_opening_hours()` → `arenas.opening_hours`.
- `list_courts(sport?)` → `courts` (nome, tipo, coberta, modalidades) da Arena.
- `get_pricing(court?/sport?)` → preços avulsos de `courts.day_config` + planos **mensalista** (módulo de bookings/mensalista).
- `check_availability(date, court?/sport?, time?)` → grade `day_config` menos `bookings` (`confirmed`/`reservado`/`pending_payment` não expirado), reaproveitando a lógica de conflito de `SupabaseBookingRepository`/dashboard.

Cada ferramenta retorna JSON compacto e determinístico; o LLM apenas redige a resposta em linguagem natural com a persona da Arena.

---

## 6. Fluxo de Processamento (mensagem recebida)

```
Meta → POST /api/whatsapp/webhook
  1. Verificar assinatura X-Hub-Signature-256 (App Secret)          [RNF-02]
  2. Idempotência: insert em whatsapp_webhook_events (dedupe        [RNF-03]
     por wa_message_id). Se duplicado → 200 {duplicate:true}.
  3. Resolver arena pelo phone_number_id → whatsapp_channels        [RF-06]
     - canal inexistente/desconectado → ignorar.
  4. Guardas: agente enabled? assinatura ativa? tipo suportado?      [RF-05, RNF-07]
     - agente off / assinatura inativa → ignorar (sem responder).
     - tipo texto ou áudio → seguir; imagem/vídeo/outros → fallback
       padrão "ainda não interpreto esse tipo de mensagem".          [RF-06.2]
  5. Responder 200 ao Meta IMEDIATAMENTE.                            [RNF-05]
  6. (assíncrono via after()/fila):
     a. Upsert conversation + registrar mensagem inbound.
     a.1 Se áudio: baixar mídia do Meta (media_id) e transcrever      [RF-06.1]
         (speech-to-text). Texto resultante vira o conteúdo da pergunta.
     b. Montar prompt: system base + guardrails + persona da Arena
        + histórico curto (janela truncada).
     c. Chamar OpenAI com as tools (seção 5.1).
     d. Loop de tool calls → executar contra Supabase (escopo arena).
     e. Obter texto final; enviar via MetaWhatsAppClient.
     f. Registrar mensagem outbound + tokens/custo; marcar evento
        como 'processed'. Em erro → 'failed' + audit log.            [RNF-08/09]
```

### 6.1 Prompt do sistema (composição)
1. **Base fixa:** papel, tom, regras de escopo, "nunca invente disponibilidade/preço — use as ferramentas", formato de resposta curto para WhatsApp.
2. **Guardrails:** só falar da Arena X; recusar pedidos fora do escopo com o `fallback_message`; não prometer reserva/pagamento (MVP informa, não reserva).
3. **Persona da Arena:** `arena_ai_agents.persona_prompt` (definido pelo gestor).
4. **Contexto injetado barato:** nome/horário da Arena (dados pequenos e estáveis) para reduzir chamadas de ferramenta.

---

## 7. Setup do Gestor (UI)

Novo card **"Agente de IA (WhatsApp)"** no detalhe da Arena (`ArenaDetailPageClient`, aba de configurações), espelhando `ArenaPixSplitSettingsCard`.

Estados/fluxo:
1. **Não conectado:** botão "Conectar WhatsApp" → Embedded Signup (Meta). Ao concluir, `embedded-signup/route.ts` troca o code por token, registra WABA + `phone_number_id`, cria `whatsapp_channels` (status `connected`).
2. **Conectado:** exibe número, nome verificado, status, última atividade; botão "Desconectar".
3. **Persona:** textarea do `persona_prompt` com contador e dicas/placeholder.
4. **Liga/Desliga:** switch `enabled` (só habilitável se canal conectado + assinatura ativa).
5. **(Opcional) Teste:** enviar mensagem de teste para o próprio número do gestor.

Server actions (`agentActions.ts`), todas com `assertArenaBackofficeAccess(arenaId)`:
- `getAgentConfigAction`, `upsertAgentConfigAction` (persona/model/limites), `toggleAgentAction`, `getChannelStatusAction`, `disconnectChannelAction`, `startEmbeddedSignupAction`.

---

## 8. Segurança e Isolamento (detalhe do requisito central)

- **Roteamento imutável:** `arena_id` sempre vem de `whatsapp_channels` via `phone_number_id`; o texto do usuário e o LLM **nunca** fornecem `arena_id`.
- **Ferramentas fechadas:** toda query é filtrada por `arena_id` do canal; o LLM não recebe nem consegue alterar esse filtro.
- **Unicidade número↔arena:** `phone_number_id UNIQUE` + `arena_id UNIQUE` + validação na conexão (rejeitar se número já vinculado).
- **Verificação Meta:** `X-Hub-Signature-256` (App Secret) em todo POST; `verify_token` no GET; rejeitar payload inválido.
- **Segredos cifrados:** token de acesso por Arena cifrado (`ENCRYPTION_KEY`) e/ou tabela service-role-only.
- **Gate de assinatura + enabled:** sem assinatura ativa ou com agente off, não há resposta.
- **Auditoria:** conexão/desconexão, toggle e falhas registrados em `audit_logs` (`entityType: 'arena_ai_agent'`).
- **LGPD:** finalidade declarada, retenção configurável de `whatsapp_messages`, opt-out do contato.

---

## 9. Controle de Custo (RNF-04)

- Modelo padrão `gpt-4o-mini` (configurável por Arena).
- `max_output_tokens` curto (respostas de WhatsApp são breves).
- Janela de histórico truncada (ex.: últimas N mensagens).
- Injeção barata de horário/nome no system prompt para evitar tool calls triviais.
- `monthly_token_cap` por Arena → ao estourar, agente pausa e avisa fallback.
- Contabilização de tokens/custo em `whatsapp_messages` + agregação para relatório.
- **Áudio:** custo adicional de transcrição por segundo; contabilizar `audio_seconds`. Limitar duração máxima aceita (ex.: descartar/avisar acima de N segundos) para conter custo.

---

## 10. Variáveis de Ambiente (novas)

```
# Meta / WhatsApp
META_APP_ID=
META_APP_SECRET=
META_WHATSAPP_VERIFY_TOKEN=        # handshake do webhook (GET)
META_GRAPH_API_VERSION=v21.0
META_CONFIG_ID=                    # config do Embedded Signup
# (Tech Provider) token de sistema, se aplicável
META_SYSTEM_USER_TOKEN=

# OpenAI
OPENAI_API_KEY=
OPENAI_AGENT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=whisper-1   # transcrição de áudio (speech-to-text)
WHATSAPP_MAX_AUDIO_SECONDS=120      # duração máxima de áudio aceita

# Cifra de segredos
AI_AGENT_ENCRYPTION_KEY=
```
Adicionar dependência `openai` (SDK) ao `package.json`.

---

## 11. Plano de Implementação — Passo a Passo

### Fase 0 — Pré-requisitos externos (paralelo, sem código)
1. Criar/config. App Meta, produto WhatsApp, Business Verification (PR-01/02/03).
2. Publicar política de privacidade/termos do agente (PR-05).
3. Criar conta OpenAI, chave e limite de gasto (PR-04).
4. Definir e registrar as env vars da seção 10 em dev/staging/prod.

### Fase 1 — Modelo de dados
5. Escrever migração idempotente com as tabelas da seção 4 (+ índices, unicidades, RLS).
6. Aplicar no SQL Editor; regenerar `types/supabase.types.ts`.
7. Atualizar `DATABASE_ARCHITECTURE.md` (nova seção do módulo).

### Fase 2 — Domínio e provedores
8. Tipos + schemas Zod (`agent.types.ts`, `agent-config.schema.ts`).
9. Repositórios Supabase (agent config + channels) no padrão do projeto.
10. `ILLMProvider` + `OpenAILLMProvider` (chat + tool calling + transcrição de áudio).
11. `IWhatsAppClient` + `MetaWhatsAppClient` (enviar mensagem, verificar assinatura, baixar mídia de áudio).
12. `lib/crypto.ts` (cifra/decifra token) e `lib/meta-signature.ts`.

### Fase 3 — Webhook
13. `GET /api/whatsapp/webhook` (handshake `verify_token`).
14. `POST /api/whatsapp/webhook`: verificação de assinatura + idempotência (espelhar `payment_webhook_events`) + roteamento por `phone_number_id` + ACK 200.

### Fase 4 — Orquestração do agente
15. `agent-tools.ts`: definição das 4 ferramentas + execução com `arena_id` fixo.
15.1 Suporte a áudio: no `MetaWhatsAppClient`, baixar mídia por `media_id`; no `OpenAILLMProvider`, transcrever; roteamento por `content_type` (texto direto, áudio→transcrição, demais→fallback).
16. `process-inbound-message.usecase.ts`: montar prompt, loop de tool calls, gerar resposta.
17. `send-agent-reply.usecase.ts`: enviar via Meta + registrar outbound/tokens.
18. Processamento assíncrono (`after()` do Next ou fila) após o ACK.

### Fase 5 — Setup do gestor (UI + actions)
19. `agentActions.ts` (config, toggle, status, conectar/desconectar) com `assertArenaBackofficeAccess`.
20. `ArenaAiAgentSettingsCard.tsx` + `ConnectWhatsAppButton.tsx`.
21. `embedded-signup/route.ts` (troca code→token, cria `whatsapp_channels`, valida unicidade).
22. Integrar card na aba de configurações da Arena.

### Fase 6 — Segurança, custo e observabilidade
23. Gate de assinatura + `enabled` no fluxo; `monthly_token_cap`.
24. Auditoria (`audit_logs`) para conexão/toggle/falhas.
25. Logs estruturados + métricas de tokens/custo.

### Fase 7 — Testes e documentação
26. Testes do orquestrador com Meta/OpenAI mockados (cenários das 4 capacidades + fora de escopo + isolamento entre arenas).
27. Teste ponta-a-ponta com número de teste do Meta (sandbox).
28. Atualizar `PRD-Web-Gestor.md` (RF/escopo/status) e `SPEC-Web-Gestor.md` (tabelas, endpoints, contratos, env).
29. Guia do gestor: "Como ativar o Agente de IA".

---

## 12. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Aprovação/verificação Meta demora (semanas) | Iniciar Fase 0 já; usar número de teste no sandbox para desenvolver em paralelo. |
| Timeout serverless no processamento LLM | ACK 200 imediato + processamento assíncrono; modelo rápido; tools enxutas. |
| Reentrega de webhook do Meta | Idempotência por `wa_message_id` (padrão já existente no projeto). |
| Alucinação de disponibilidade/preço | Sempre via ferramentas contra o banco; prompt proíbe inventar. |
| Vazamento entre arenas | `arena_id` derivado do canal; filtros fixos; unicidade número↔arena. |
| Custo fora de controle | Modelo econômico, teto por Arena, truncamento de contexto, métricas. |
| Token de acesso exposto | Cifra em app + acesso service-role-only. |
| Cliente envia imagem/vídeo | Resposta padrão "ainda não interpreto esse tipo de mensagem" (fora do escopo MVP). |
| Áudio longo/ruído eleva custo e erra transcrição | Limitar duração aceita, contabilizar `audio_seconds`, pedir reenvio em texto se a transcrição vier vazia/incerta. |

---

## 13. Critérios de Aceite (MVP)

- Conectar um número real via Embedded Signup e ver status "conectado".
- Tentar vincular o mesmo número a outra Arena → bloqueado.
- Ligar o agente e, ao enviar "quais horários vocês funcionam?", receber a resposta correta da Arena.
- Perguntar preço avulso e mensal → valores reais do `day_config`/mensalista.
- Perguntar "tem quadra livre amanhã às 19h?" → resposta refletindo `bookings` reais.
- Desligar o agente → mensagens deixam de ser respondidas.
- Duas arenas com números distintos nunca cruzam dados.
- Pergunta fora de escopo → fallback educado.
- Enviar uma **mensagem de voz** perguntando horários → o agente transcreve e responde corretamente em texto.
- Enviar **imagem ou vídeo** → resposta padrão informando que esse tipo ainda não é interpretado.
