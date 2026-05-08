-- Serviços de catálogo não escopam por estação/tipo de estação (station_id / station_type_id nulos).
-- Produtos continuam enviando station_type_id (e station_id) pelo app.
alter table public.products alter column station_type_id drop not null;

comment on column public.products.station_type_id is
  'Tipo de estação legado para escopo quando station_id é nulo; pode ser nulo em itens catalog_kind = service.';
