create table if not exists public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  booking_date date not null,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists room_bookings_date_room_idx
  on public.room_bookings (booking_date, room_id);

alter table public.room_bookings enable row level security;
