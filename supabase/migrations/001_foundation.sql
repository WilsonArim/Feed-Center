-- ============================================
-- Feed-Center Foundation Schema
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. User Settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  theme text default 'auto' check (theme in ('dark', 'light', 'auto')),
  currency text default 'EUR',
  language text default 'pt-pt',
  notifications_email boolean default true,
  notifications_push boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);


-- 3. Financial Entries (stub)
create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'bill')),
  amount numeric(12,2) not null,
  currency text default 'EUR',
  category text,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.financial_entries enable row level security;

create policy "Users can CRUD own entries"
  on public.financial_entries for all
  using (auth.uid() = user_id);


-- 4. Tasks (stub)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority integer default 0,
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);


-- 5. Links (stub)
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  favicon_url text,
  tags text[] default '{}',
  is_dead boolean default false,
  created_at timestamptz default now()
);

alter table public.links enable row level security;

create policy "Users can CRUD own links"
  on public.links for all
  using (auth.uid() = user_id);
