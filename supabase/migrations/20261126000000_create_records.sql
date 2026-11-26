-- 兌換紀錄 records: table, updated_at trigger, index and RLS. See docs/database.md.

create table public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  input_format text not null check (input_format in ('name_amount', 'amount')),
  entry_count integer not null check (entry_count between 1 and 1000),
  total_amount bigint not null check (total_amount >= 0),
  denominations integer[] not null,
  denomination_counts jsonb not null,
  rows jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every update (e.g. rename)
create extension if not exists moddatetime schema extensions;

create trigger records_set_updated_at
  before update on public.records
  for each row execute procedure extensions.moddatetime (updated_at);

create index records_user_created_at_idx on public.records (user_id, created_at desc);

alter table public.records enable row level security;

-- Records older than 2 years stay in the table but can no longer be read or renamed
create policy "Members read their own records from the last 2 years" on public.records
  for select to authenticated
  using ((select auth.uid()) = user_id and created_at > now() - interval '2 years');
create policy "Members add their own records" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members rename their own records from the last 2 years" on public.records
  for update to authenticated
  using ((select auth.uid()) = user_id and created_at > now() - interval '2 years')
  with check ((select auth.uid()) = user_id);
create policy "Members delete their own records" on public.records
  for delete to authenticated using ((select auth.uid()) = user_id);
