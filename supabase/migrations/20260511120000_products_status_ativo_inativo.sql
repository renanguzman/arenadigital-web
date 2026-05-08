-- Catálogo: `products.status` passa a ser Ativo/Inativo (antes Em estoque/Em falta — confundia com saldo).

-- 1) Remove o check legado antes de gravar novos valores.
do $$
declare
  con record;
begin
  for con in
    select c.conname::text as conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'products'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
      and pg_get_constraintdef(c.oid) ilike '%em estoque%'
      and pg_get_constraintdef(c.oid) ilike '%em falta%'
  loop
    execute format('alter table public.products drop constraint if exists %I', con.conname);
  end loop;
end$$;

alter table public.products
  drop constraint if exists products_status_check;

-- 2) Migra dados.
update public.products
set status = 'Ativo'
where status = 'Em estoque';

update public.products
set status = 'Inativo'
where status = 'Em falta';

update public.products
set status = 'Ativo'
where status is null or status not in ('Ativo', 'Inativo');

alter table public.products
  alter column status set default 'Ativo';

-- 3) Novo check.
alter table public.products
  add constraint products_status_check
  check (status in ('Ativo', 'Inativo'));

comment on column public.products.status is
  'Disponibilidade no catálogo: Ativo (ofertado) ou Inativo (fora do catálogo). Independente de stock_quantity.';
