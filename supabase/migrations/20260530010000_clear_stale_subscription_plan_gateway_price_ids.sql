-- Os valores comerciais dos planos foram remapeados em 20260530000000.
-- Para evitar cobrança Stripe com Price IDs antigos, limpamos os IDs externos.
-- Em ambiente Stripe, recrie/associe price IDs novos explicitamente antes de vender.

update public.subscription_plans
set gateway_price_id = '',
    updated_at = now()
where key in ('experimental', 'starter', 'max', 'pro', 'parceiro')
  and coalesce(gateway_price_id, '') <> '';
