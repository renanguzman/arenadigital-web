-- Ajusta o catálogo comercial atual.
-- Observação: gateway_price_id é preservado quando já existir. Para Stripe,
-- confirme no provedor se cada price_id corresponde ao valor mensal correto.

alter table public.arena_subscriptions
  add column if not exists experimental_started_at timestamptz;

update public.arena_subscriptions
set experimental_started_at = coalesce(experimental_started_at, created_at)
where plan_key = 'experimental'
  and experimental_started_at is null;

insert into subscription_plans (key, label, price_cents, max_spaces, gateway_price_id, sort_order, features, is_active)
values
  (
    'experimental',
    'Plano Experimental',
    0,
    5,
    '',
    0,
    '["5 dias grátis mediante cartão válido", "Até 5 espaços", "Disponível uma única vez"]'::jsonb,
    true
  ),
  (
    'starter',
    'Plano Starter',
    24900,
    10,
    '',
    1,
    '["Contrato anual", "Até 10 espaços", "Cobrança recorrente mensal"]'::jsonb,
    true
  ),
  (
    'max',
    'Plano Max',
    54900,
    20,
    '',
    2,
    '["Contrato anual", "De 11 a 20 espaços", "Cobrança recorrente mensal"]'::jsonb,
    true
  ),
  (
    'pro',
    'Plano PRO',
    94900,
    30,
    '',
    3,
    '["Contrato anual", "De 21 a 30 espaços", "Cobrança recorrente mensal"]'::jsonb,
    true
  ),
  (
    'parceiro',
    'Plano Parceiro',
    24900,
    2147483647,
    '',
    90,
    '["Contrato anual", "Espaços ilimitados", "Plano atribuído manualmente"]'::jsonb,
    true
  )
on conflict (key) do update set
  label = excluded.label,
  price_cents = excluded.price_cents,
  max_spaces = excluded.max_spaces,
  gateway_price_id = coalesce(nullif(subscription_plans.gateway_price_id, ''), excluded.gateway_price_id),
  sort_order = excluded.sort_order,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();
