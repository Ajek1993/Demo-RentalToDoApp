-- SKRYPT SQL DO WYKONANIA W SUPABASE SQL EDITOR
-- Skopiuj i wklej całą zawartość tego pliku do Supabase SQL Editor i wykonaj

-- Tabela profili (rozszerzenie auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Tabela zleceń
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  date date not null,
  time time not null,
  location text not null,
  notes text,
  status text default 'active' check (status in ('active', 'completed', 'deleted')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Tabela przypisań
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz default now()
);

-- Tabela subskrypcji push (dla Etapu E)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- RLS - włącz dla wszystkich tabel
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.assignments enable row level security;
alter table public.push_subscriptions enable row level security;

-- Polityki RLS
create policy "Profiles: select all" on public.profiles for select using (true);
create policy "Profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "Profiles: update own" on public.profiles for update using (auth.uid() = id);

create policy "Orders: select all" on public.orders for select using (true);
create policy "Orders: insert auth" on public.orders for insert with check (auth.uid() = created_by);
create policy "Orders: update all" on public.orders for update using (true);

create policy "Assignments: select all" on public.assignments for select using (true);
create policy "Assignments: insert auth" on public.assignments for insert with check (true);
create policy "Assignments: delete own" on public.assignments for delete using (user_id = auth.uid());

create policy "Push: select own" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Push: insert own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Push: delete own" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- Trigger: auto-tworzenie profilu przy rejestracji
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Użytkownik'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Włącz Realtime dla tabel (potrzebne w Etapie D)
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.assignments;
