-- Rotativo redesign: status, courts, inscrição payment fields, credit system

-- Session status
alter table public.rotativos
  add column if not exists status text not null default 'ativo'
    check (status in ('ativo', 'desativado'));

comment on column public.rotativos.status is 'ativo = aceita inscrições; desativado = sessão pausada';

-- Rotativo ↔ courts (N:N)
create table if not exists public.rotativo_courts (
  id uuid default gen_random_uuid() primary key,
  rotativo_id uuid not null references public.rotativos(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  unique (rotativo_id, court_id)
);

alter table public.rotativo_courts enable row level security;
create policy "Allow all for rotativo_courts" on public.rotativo_courts for all using (true) with check (true);

-- Inscrição payment details
alter table public.rotativo_inscricoes
  add column if not exists tipo_pagamento text check (tipo_pagamento in ('credito', 'avulso')),
  add column if not exists modo_pagamento_id uuid references public.modo_pagamento(id) on delete set null,
  add column if not exists observacao text;

-- Credit pricing packages (config)
create table if not exists public.rotativo_pacotes (
  id uuid default gen_random_uuid() primary key,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  valor_reais numeric(10, 2) not null check (valor_reais >= 0),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rotativo_pacotes enable row level security;
create policy "Allow all for rotativo_pacotes" on public.rotativo_pacotes for all using (true) with check (true);

-- Credit lots (FIFO consumption)
create table if not exists public.rotativo_credito_lotes (
  id uuid default gen_random_uuid() primary key,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  atleta_id uuid not null references public.atleta(id) on delete cascade,
  quantidade_inicial integer not null check (quantidade_inicial > 0),
  quantidade_restante integer not null check (quantidade_restante >= 0),
  data_vencimento date not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rotativo_credito_lotes enable row level security;
create policy "Allow all for rotativo_credito_lotes" on public.rotativo_credito_lotes for all using (true) with check (true);

-- Credit movements ledger
create table if not exists public.rotativo_credito_movimentos (
  id uuid default gen_random_uuid() primary key,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  atleta_id uuid not null references public.atleta(id) on delete cascade,
  tipo text not null check (tipo in ('compra', 'uso', 'vencimento')),
  quantidade integer not null,
  lote_id uuid references public.rotativo_credito_lotes(id) on delete set null,
  inscricao_id uuid references public.rotativo_inscricoes(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rotativo_credito_movimentos enable row level security;
create policy "Allow all for rotativo_credito_movimentos" on public.rotativo_credito_movimentos for all using (true) with check (true);

-- Available credit balance per athlete
create or replace view public.rotativo_credito_saldo as
select
  l.arena_id,
  l.atleta_id,
  coalesce(sum(l.quantidade_restante), 0)::integer as saldo
from public.rotativo_credito_lotes l
where l.data_vencimento >= current_date
  and l.quantidade_restante > 0
group by l.arena_id, l.atleta_id;

grant select on public.rotativo_credito_saldo to anon, authenticated;

comment on table public.rotativo_pacotes is 'Pacotes de preço: N rotativos = R$ X';
comment on table public.rotativo_credito_lotes is 'Lotes de créditos de rotativo por atleta (FIFO)';
comment on table public.rotativo_credito_movimentos is 'Extrato de movimentações de créditos de rotativo';
