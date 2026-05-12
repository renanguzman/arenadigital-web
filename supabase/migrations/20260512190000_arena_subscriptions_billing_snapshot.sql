-- Cache legível de cobrança/cartão (Asaas: GET assinatura + cobranças). Sem PAN/CVV.
-- Atualizado via webhooks / sync após checkout; a UI usa como fallback se a API falhar.

alter table public.arena_subscriptions
  add column if not exists billing_snapshot jsonb;

comment on column public.arena_subscriptions.billing_snapshot is
  'Snapshot v1: billingType, valor cobrança, bandeira, últimos 4 dígitos, parcela (Asaas).';
