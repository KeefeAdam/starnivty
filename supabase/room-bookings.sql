create table if not exists public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  customer_name text,
  order_number text unique,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.room_bookings
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists customer_name text,
  add column if not exists order_number text;

create unique index if not exists room_bookings_order_number_idx
  on public.room_bookings (order_number)
  where order_number is not null;

create index if not exists room_bookings_date_room_idx
  on public.room_bookings (booking_date, room_id);

alter table public.room_bookings enable row level security;
