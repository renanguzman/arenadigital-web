-- Renomeia colunas gateway-específicas (Stripe) para nomes neutros.
-- O schema agora não vincula a tabela a um provedor de pagamento específico —
-- o nome do provedor ativo vive no código (PaymentGateway implementation).
--
-- PostgreSQL preserva automaticamente os índices ao renomear colunas, então
-- não precisamos recriá-los manualmente.

alter table arena_subscriptions
  rename column stripe_customer_id to gateway_customer_id;

alter table arena_subscriptions
  rename column stripe_subscription_id to gateway_subscription_id;

alter table subscription_plans
  rename column stripe_price_id to gateway_price_id;
