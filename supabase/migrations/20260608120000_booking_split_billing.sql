-- Cobrança avulsa separada por participante (ex.: aula coletiva / pilates).
alter table bookings
  add column if not exists cobranca_por_participante boolean not null default false;

alter table booking_participants
  add column if not exists valor numeric(10, 2),
  add column if not exists pago_em timestamptz;

comment on column bookings.cobranca_por_participante is
  'Quando true, cada participante da reserva gera cobrança/entrada individual.';

comment on column booking_participants.valor is
  'Valor cobrado deste participante quando cobranca_por_participante = true.';

comment on column booking_participants.pago_em is
  'Data/hora em que o pagamento individual deste participante foi confirmado.';
