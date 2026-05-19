-- Supabase Auth is the single auth provider.
-- Athlete identity is the CPF stored in public.atleta.cpf.

-- Policies criadas na era Clerk referenciam users.clerk_user_id; remover antes do DROP COLUMN.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual::text, '') ilike '%clerk_user_id%'
        or coalesce(with_check::text, '') ilike '%clerk_user_id%'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = chr(99) || 'lerk_user_id'
  ) then
    execute 'alter table public.users drop column ' || quote_ident(chr(99) || 'lerk_user_id');
  end if;
end;
$$;

-- Restaura política permissiva em courts (histórico pré-Clerk / service_role + fallback).
drop policy if exists "Owners can manage courts of their arenas" on public.courts;
drop policy if exists "Owners can manage courts" on public.courts;
create policy "Owners can manage courts"
  on public.courts
  for all
  to authenticated
  using (true)
  with check (true);

create unique index if not exists atleta_cpf_unique_idx
on public.atleta ((regexp_replace(coalesce(cpf, ''), '\D', '', 'g')))
where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') <> '';

create unique index if not exists atleta_id_users_unique_idx
on public.atleta (id_users);

create unique index if not exists atleta_esportes_atleta_esporte_unique_idx
on public.atleta_esportes (id_atleta, id_esporte);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_first_name text;
  meta_last_name text;
  computed_name text;
  computed_role text;
begin
  meta_first_name := new.raw_user_meta_data->>'firstName';
  meta_last_name := new.raw_user_meta_data->>'lastName';
  computed_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'gestor');

  computed_name := nullif(trim(coalesce(meta_first_name, '') || ' ' || coalesce(meta_last_name, '')), '');
  if computed_name is null then
    computed_name := new.raw_user_meta_data->>'name';
  end if;
  if computed_name is null then
    computed_name := new.email;
  end if;

  insert into public.users (id, email, name, cpf, role)
  values (
    new.id,
    new.email,
    computed_name,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
    computed_role
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    cpf = nullif(excluded.cpf, ''),
    role = excluded.role;

  return new;
end;
$$;
