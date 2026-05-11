-- Plano de baixo valor para testes de cobrança em produção (ex.: Asaas).
-- R$ 5,00 = 500 centavos (price_cents). A chave `test_prod` existe no banco;
-- a app só passa a aceitar essa chave quando o schema/código for atualizado.

insert into subscription_plans (key, label, price_cents, max_spaces, gateway_price_id, sort_order, features, is_active)
values (
  'test_prod',
  'Arena TESTE (R$ 5)',
  500,
  5,
  '',
  99,
  '["Cobrança de R$ 5 para validação do gateway em produção"]'::jsonb,
  true
)
on conflict (key) do update set
  label = excluded.label,
  price_cents = excluded.price_cents,
  max_spaces = excluded.max_spaces,
  sort_order = excluded.sort_order,
  features = excluded.features,
  updated_at = now();
