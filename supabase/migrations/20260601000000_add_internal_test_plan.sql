-- Plano interno para arenas de teste.
-- Ele nunca deve aparecer no catalogo publico e libera acesso sem gateway ou cartao.
--
-- Ativar para uma arena dedicada de testes:
--   select public.set_internal_test_plan_for_arena('<arena_id>'::uuid);
--
-- Desativar:
--   select public.set_internal_test_plan_for_arena('<arena_id>'::uuid, false);

alter table public.subscription_plans
  add column if not exists is_internal boolean not null default false;

alter table public.arena_subscriptions
  alter column gateway_customer_id drop not null;

insert into public.subscription_plans (
  key,
  label,
  price_cents,
  max_spaces,
  gateway_price_id,
  sort_order,
  features,
  is_active,
  is_internal
)
values (
  'interno',
  'Plano Interno',
  0,
  2147483647,
  '',
  1000,
  '["Acesso interno para testes", "Espacos ilimitados", "Sem cobranca ou cartao"]'::jsonb,
  true,
  true
)
on conflict (key) do update set
  label = excluded.label,
  price_cents = excluded.price_cents,
  max_spaces = excluded.max_spaces,
  gateway_price_id = '',
  sort_order = excluded.sort_order,
  features = excluded.features,
  is_active = excluded.is_active,
  is_internal = excluded.is_internal,
  updated_at = now();

drop policy if exists "public_read_subscription_plans"
  on public.subscription_plans;

create policy "public_read_subscription_plans"
  on public.subscription_plans for select
  to anon, authenticated
  using (not is_internal);

create or replace function public.set_internal_test_plan_for_arena(
  target_arena_id uuid,
  enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  internal_plan_id uuid;
begin
  select id
    into internal_plan_id
  from public.subscription_plans
  where key = 'interno'
    and is_internal
    and is_active;

  if internal_plan_id is null then
    raise exception 'Plano interno nao encontrado ou inativo.';
  end if;

  if enabled then
    if exists (
      select 1
      from public.arena_subscriptions
      where arena_id = target_arena_id
        and plan_id is distinct from internal_plan_id
    ) then
      raise exception 'A arena ja possui uma assinatura comum. Use uma arena dedicada para testes internos.';
    end if;

    insert into public.arena_subscriptions (
      arena_id,
      gateway_customer_id,
      gateway_subscription_id,
      gateway_checkout_id,
      billing_snapshot,
      plan_key,
      plan_id,
      status,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      updated_at
    )
    values (
      target_arena_id,
      null,
      null,
      null,
      null,
      'interno',
      internal_plan_id,
      'incomplete',
      null,
      false,
      null,
      now()
    )
    on conflict (arena_id) do update set
      gateway_customer_id = null,
      gateway_subscription_id = null,
      gateway_checkout_id = null,
      billing_snapshot = null,
      plan_key = excluded.plan_key,
      plan_id = excluded.plan_id,
      status = excluded.status,
      current_period_end = null,
      cancel_at_period_end = false,
      canceled_at = null,
      updated_at = now();
  else
    delete from public.arena_subscriptions
    where arena_id = target_arena_id
      and plan_id = internal_plan_id
      and gateway_subscription_id is null;
  end if;
end;
$$;

revoke all on function public.set_internal_test_plan_for_arena(uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.set_internal_test_plan_for_arena(uuid, boolean)
  to service_role;

comment on column public.subscription_plans.is_internal is
  'Planos internos nao aparecem no catalogo e liberam acesso somente por atribuicao administrativa.';

comment on function public.set_internal_test_plan_for_arena(uuid, boolean) is
  'Ativa ou remove o plano interno de uma arena dedicada de testes sem criar cobranca no gateway.';
