-- ============================================================
-- Venus Egg Traders — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- One JSON document holds the whole app state per user.
create table if not exists public.workspaces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-Level Security: each signed-in user can only read/write their own row.
alter table public.workspaces enable row level security;

drop policy if exists "own workspace select" on public.workspaces;
create policy "own workspace select" on public.workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "own workspace insert" on public.workspaces;
create policy "own workspace insert" on public.workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "own workspace update" on public.workspaces;
create policy "own workspace update" on public.workspaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own workspace delete" on public.workspaces;
create policy "own workspace delete" on public.workspaces
  for delete using (auth.uid() = user_id);

-- ============================================================
-- After running this:
-- 1. Authentication → Users → Add user (email + password, tick Auto Confirm).
-- 2. Copy Project URL + anon public key from Project Settings → API.
-- 3. Put them in the app's .env (see .env.example), then restart the dev server.
-- ============================================================
