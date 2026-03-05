-- Migracja: Dyspozycyjność pracowników
-- Tabela przechowuje sloty czasowe dostępności per dzień

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  is_full_day boolean default false,
  start_time time,
  end_time time,
  created_at timestamptz default now(),

  -- Walidacja: full day nie potrzebuje godzin, slot potrzebuje obu
  constraint valid_slot check (
    (is_full_day = true and start_time is null and end_time is null)
    or (is_full_day = false and start_time is not null and end_time is not null and start_time < end_time)
  )
);

-- Indeks na szybkie wyszukiwanie po dacie
create index idx_availability_date on public.availability(date);
create index idx_availability_user_date on public.availability(user_id, date);

-- RLS
alter table public.availability enable row level security;

create policy "Availability: select all" on public.availability for select using (true);
create policy "Availability: insert own" on public.availability for insert with check (auth.uid() = user_id);
create policy "Availability: update own" on public.availability for update using (auth.uid() = user_id);
create policy "Availability: delete own" on public.availability for delete using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.availability;
