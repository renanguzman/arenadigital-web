alter table public.users
  add column if not exists onboarding_completed_at timestamp with time zone,
  add column if not exists onboarding_version integer not null default 0;

alter table public.users
  drop constraint if exists users_onboarding_version_check;

alter table public.users
  add constraint users_onboarding_version_check
  check (onboarding_version >= 0);
