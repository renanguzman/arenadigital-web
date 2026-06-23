-- Permite que eventos de auditoria originados pelo gateway de pagamentos
-- sejam persistidos com o actor_type usado pela aplicação.

alter table audit_logs
  drop constraint if exists audit_logs_actor_type_check;

alter table audit_logs
  add constraint audit_logs_actor_type_check
  check (actor_type in ('user', 'system', 'stripe_webhook', 'payment_webhook'));
