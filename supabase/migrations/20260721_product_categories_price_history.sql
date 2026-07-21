-- =============================================================================
-- Catálogo: categorias de produtos/serviços + histórico de alterações de preço
-- Aplicar manualmente no SQL Editor do Supabase (projeto Web Gestor).
-- Idempotente: pode ser executado mais de uma vez sem efeitos colaterais.
-- =============================================================================

-- 1. Categorias de produtos/serviços (por arena, gerenciadas pelo gestor)
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  name text not null,
  kind text not null default 'product' check (kind in ('product', 'service')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_arena_kind_name_key unique (arena_id, kind, name)
);

create index if not exists idx_product_categories_arena
  on public.product_categories (arena_id, kind, sort_order);

alter table public.product_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_categories'
      and policyname = 'Allow all for product_categories'
  ) then
    create policy "Allow all for product_categories"
      on public.product_categories for all using (true) with check (true);
  end if;
end $$;

-- 2. Vínculo do produto com a categoria
alter table public.products
  add column if not exists category_id uuid references public.product_categories(id) on delete set null;

create index if not exists idx_products_category_id
  on public.products (category_id);

-- 2.1. Remove a check fixa de item_type: agora ele recebe o nome livre da categoria
alter table public.products
  drop constraint if exists products_item_type_check;

-- 3. Histórico de alterações de preço (individual e em massa)
create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  old_price numeric(10,2) not null,
  new_price numeric(10,2) not null,
  change_type text not null default 'manual' check (change_type in ('manual', 'bulk')),
  adjustment_percent numeric(7,2),
  batch_id uuid,
  reason text,
  changed_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_price_history_product
  on public.product_price_history (product_id, created_at desc);

create index if not exists idx_product_price_history_batch
  on public.product_price_history (batch_id);

alter table public.product_price_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_price_history'
      and policyname = 'Allow all for product_price_history'
  ) then
    create policy "Allow all for product_price_history"
      on public.product_price_history for all using (true) with check (true);
  end if;
end $$;

-- 4. Backfill: cria categorias a partir dos item_type já cadastrados e vincula os produtos
insert into public.product_categories (arena_id, name, kind)
select distinct
  p.arena_id,
  trim(p.item_type),
  case when p.catalog_kind = 'service' then 'service' else 'product' end
from public.products p
where coalesce(trim(p.item_type), '') <> ''
on conflict on constraint product_categories_arena_kind_name_key do nothing;

update public.products p
set category_id = c.id
from public.product_categories c
where p.category_id is null
  and c.arena_id = p.arena_id
  and c.name = trim(p.item_type)
  and c.kind = (case when p.catalog_kind = 'service' then 'service' else 'product' end);
