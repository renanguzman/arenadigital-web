-- Serviços do catálogo vinculados a uma reserva (ex.: aluguel de raquete cobrado junto da locação)
create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists booking_services_booking_id_idx on public.booking_services (booking_id);
create index if not exists booking_services_product_id_idx on public.booking_services (product_id);

comment on table public.booking_services is 'Linhas de serviços do catálogo (catalog_kind=service) cobrados junto de uma reserva.';

alter table public.booking_services enable row level security;

drop policy if exists "block_anon" on public.booking_services;
create policy "block_anon" on public.booking_services for all to anon using (false);
