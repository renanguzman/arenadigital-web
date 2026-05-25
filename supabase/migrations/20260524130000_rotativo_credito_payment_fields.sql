-- Payment info on credit purchase movements (for finance traceability)
alter table public.rotativo_credito_movimentos
  add column if not exists valor_pago numeric(10, 2),
  add column if not exists modo_pagamento_id uuid references public.modo_pagamento(id) on delete set null;

comment on column public.rotativo_credito_movimentos.valor_pago is 'Valor pago na compra de créditos (tipo compra)';
