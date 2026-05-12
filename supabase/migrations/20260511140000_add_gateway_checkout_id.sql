-- Adiciona gateway_checkout_id para o fluxo de Checkout hospedado do Asaas.
-- Como a subscription só é criada pelo Asaas após o pagamento (webhook CHECKOUT_PAID),
-- precisamos correlacionar o evento de volta à arena pelo id do checkout.

alter table arena_subscriptions
  add column gateway_checkout_id text;

create index on arena_subscriptions (gateway_checkout_id);
