-- Inbox de webhooks de pagamento e histórico de tentativas de checkout.
-- Essas tabelas separam controle operacional/idempotência da auditoria de negócio.

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed', 'ignored')),
  arena_id uuid references public.arenas(id) on delete set null,
  gateway_subscription_id text,
  gateway_checkout_id text,
  payload jsonb,
  error_message text,
  attempts integer not null default 1 check (attempts > 0),
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index idx_payment_webhook_events_status
  on public.payment_webhook_events (status, received_at desc);

create index idx_payment_webhook_events_arena
  on public.payment_webhook_events (arena_id, received_at desc)
  where arena_id is not null;

create index idx_payment_webhook_events_subscription
  on public.payment_webhook_events (gateway_subscription_id)
  where gateway_subscription_id is not null;

create index idx_payment_webhook_events_checkout
  on public.payment_webhook_events (gateway_checkout_id)
  where gateway_checkout_id is not null;

alter table public.payment_webhook_events enable row level security;

create policy "block_anon_payment_webhook_events"
  on public.payment_webhook_events for all
  to anon
  using (false);

create policy "block_authenticated_payment_webhook_events"
  on public.payment_webhook_events for all
  to authenticated
  using (false);

create table public.payment_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  checkout_id text not null,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  plan_key text not null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'created'
    check (status in ('created', 'paid', 'canceled', 'expired', 'failed')),
  gateway_customer_id text,
  replaces_gateway_subscription_id text,
  result_gateway_subscription_id text,
  created_by_user_id uuid references public.users(id) on delete set null,
  metadata jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, checkout_id)
);

create index idx_payment_checkout_attempts_arena
  on public.payment_checkout_attempts (arena_id, created_at desc);

create index idx_payment_checkout_attempts_status
  on public.payment_checkout_attempts (status, created_at desc);

create index idx_payment_checkout_attempts_replaces_subscription
  on public.payment_checkout_attempts (replaces_gateway_subscription_id)
  where replaces_gateway_subscription_id is not null;

alter table public.payment_checkout_attempts enable row level security;

create policy "block_anon_payment_checkout_attempts"
  on public.payment_checkout_attempts for all
  to anon
  using (false);

create policy "block_authenticated_payment_checkout_attempts"
  on public.payment_checkout_attempts for all
  to authenticated
  using (false);
