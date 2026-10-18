create table public.machine_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  machine text not null default 'cnc-router' check (machine = 'cnc-router'),
  kind text not null check (kind in ('calibration', 'note', 'setting', 'protocol')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 20000),
  calibration jsonb,
  created_at timestamptz not null default now(),
  constraint calibration_payload check (
    (kind = 'calibration' and calibration is not null and jsonb_typeof(calibration) = 'object')
    or (kind <> 'calibration' and calibration is null)
  )
);

create index machine_entries_owner_machine_date
  on public.machine_entries (owner_id, machine, created_at desc);

alter table public.machine_entries enable row level security;
revoke all on public.machine_entries from anon;
grant select, insert, update, delete on public.machine_entries to authenticated;

create policy "Read own machine entries" on public.machine_entries
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own machine entries" on public.machine_entries
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Delete own machine entries" on public.machine_entries
  for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "Update own machine entries" on public.machine_entries
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
