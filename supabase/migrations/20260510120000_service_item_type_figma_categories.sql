-- Categorias de tipo de serviço alinhadas ao cadastro (Figma).
-- Migra valores antigos do cadastro de serviço antes de apertar o check.

update public.products
set item_type = 'Educação e evolução técnica'
where catalog_kind = 'service' and item_type = 'Aula';

update public.products
set item_type = 'Conveniência'
where catalog_kind = 'service' and item_type = 'Taxa';

update public.products
set item_type = 'Outro'
where catalog_kind = 'service' and item_type = 'Serviço';

alter table public.products
  drop constraint if exists products_item_type_check;

alter table public.products
  add constraint products_item_type_check
  check (
    item_type in (
      'Alimentação',
      'Bebida',
      'Vestimenta',
      'Acessório',
      'Aluguel',
      'Saúde e bem-estar',
      'Educação e evolução técnica',
      'Entretenimento',
      'Conveniência',
      'Outro'
    )
  );
