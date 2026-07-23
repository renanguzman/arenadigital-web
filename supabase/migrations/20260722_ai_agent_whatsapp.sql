-- =============================================================================
-- Agente de IA da Arena (WhatsApp + LLM) — modelo de dados (MVP)
-- Aplicar manualmente no SQL Editor do Supabase (projeto Web Gestor).
-- Idempotente: pode ser executado mais de uma vez sem efeitos colaterais.
--
-- Segurança do token de acesso: guardado CIFRADO EM APLICAÇÃO na coluna
-- whatsapp_channels.access_token_encrypted (chave AI_AGENT_ENCRYPTION_KEY).
-- Nunca gravar o token em texto puro.
-- =============================================================================

-- 1. Configuração do agente por arena (liga/desliga, persona, limites)
create table if not exists public.arena_ai_agents (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  enabled boolean not null default false,
  persona_prompt text,
  model text not null default 'gpt-4o-mini',
  temperature numeric(3,2) not null default 0.30,
  max_output_tokens integer not null default 500,
  monthly_token_cap integer,
  fallback_message text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arena_ai_agents_arena_key unique (arena_id)
);

create index if not exists idx_arena_ai_agents_arena
  on public.arena_ai_agents (arena_id);

alter table public.arena_ai_agents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arena_ai_agents'
      and policyname = 'Allow all for arena_ai_agents'
  ) then
    create policy "Allow all for arena_ai_agents"
      on public.arena_ai_agents for all using (true) with check (true);
  end if;
end $$;

-- 2. Canal de WhatsApp vinculado à arena (um número : uma arena)
create table if not exists public.whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  provider text not null default 'meta',
  phone_number_id text not null,
  waba_id text not null,
  display_phone_number text,
  verified_name text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'error', 'disconnected')),
  connected_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um número pertence a exatamente uma arena, e uma arena a um único número:
  constraint whatsapp_channels_arena_key unique (arena_id),
  constraint whatsapp_channels_phone_number_id_key unique (phone_number_id)
);

create index if not exists idx_whatsapp_channels_phone_number_id
  on public.whatsapp_channels (phone_number_id);
create index if not exists idx_whatsapp_channels_arena
  on public.whatsapp_channels (arena_id);

alter table public.whatsapp_channels enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_channels'
      and policyname = 'Allow all for whatsapp_channels'
  ) then
    create policy "Allow all for whatsapp_channels"
      on public.whatsapp_channels for all using (true) with check (true);
  end if;
end $$;

-- 3. Idempotência de eventos de webhook (espelha payment_webhook_events)
create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  provider_event_id text,
  wa_message_id text,
  phone_number_id text,
  arena_id uuid references public.arenas(id) on delete set null,
  event_type text,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed', 'ignored')),
  payload jsonb,
  error_message text,
  attempts integer not null default 0,
  processing_started_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe de mensagem: uma mensagem do WhatsApp é processada uma única vez.
create unique index if not exists uq_whatsapp_webhook_events_message
  on public.whatsapp_webhook_events (provider, wa_message_id)
  where wa_message_id is not null;

create index if not exists idx_whatsapp_webhook_events_status
  on public.whatsapp_webhook_events (status, created_at desc);
create index if not exists idx_whatsapp_webhook_events_arena
  on public.whatsapp_webhook_events (arena_id);

alter table public.whatsapp_webhook_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_webhook_events'
      and policyname = 'Allow all for whatsapp_webhook_events'
  ) then
    create policy "Allow all for whatsapp_webhook_events"
      on public.whatsapp_webhook_events for all using (true) with check (true);
  end if;
end $$;

-- 4. Conversas (thread por contato/arena)
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  channel_id uuid references public.whatsapp_channels(id) on delete set null,
  contact_wa_id text not null,
  contact_name text,
  last_message_at timestamptz,
  message_count integer not null default 0,
  status text not null default 'open' check (status in ('open', 'idle', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_conversations_arena_contact_key unique (arena_id, contact_wa_id)
);

create index if not exists idx_whatsapp_conversations_arena
  on public.whatsapp_conversations (arena_id, last_message_at desc);

alter table public.whatsapp_conversations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_conversations'
      and policyname = 'Allow all for whatsapp_conversations'
  ) then
    create policy "Allow all for whatsapp_conversations"
      on public.whatsapp_conversations for all using (true) with check (true);
  end if;
end $$;

-- 5. Log de mensagens (inbound/outbound, custo, transcrição de áudio)
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  wa_message_id text,
  content text,
  content_type text not null default 'text'
    check (content_type in ('text', 'audio', 'unsupported')),
  transcribed_from_audio boolean not null default false,
  media_id text,
  llm_model text,
  transcription_model text,
  prompt_tokens integer,
  completion_tokens integer,
  audio_seconds numeric(7,2),
  tool_calls jsonb,
  status text not null default 'received'
    check (status in ('received', 'sent', 'delivered', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_conversation
  on public.whatsapp_messages (conversation_id, created_at desc);
create index if not exists idx_whatsapp_messages_arena
  on public.whatsapp_messages (arena_id, created_at desc);
create unique index if not exists uq_whatsapp_messages_wa_message_id
  on public.whatsapp_messages (wa_message_id)
  where wa_message_id is not null;

alter table public.whatsapp_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_messages'
      and policyname = 'Allow all for whatsapp_messages'
  ) then
    create policy "Allow all for whatsapp_messages"
      on public.whatsapp_messages for all using (true) with check (true);
  end if;
end $$;

-- 6. Trigger de updated_at (reaproveita função existente se houver; cria se não)
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace
  ) then
    create function public.set_updated_at()
    returns trigger language plpgsql as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'arena_ai_agents',
    'whatsapp_channels',
    'whatsapp_conversations'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = format('trg_%s_updated_at', t)
    ) then
      execute format(
        'create trigger trg_%1$s_updated_at before update on public.%1$s
           for each row execute function public.set_updated_at()',
        t
      );
    end if;
  end loop;
end $$;
