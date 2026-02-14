-- Add athlete_id and sport_id and price to bookings table
alter table bookings
add column if not exists athlete_id uuid references atleta(id) on delete set null,
add column if not exists sport_id uuid references sports(id) on delete set null,
add column if not exists price numeric(10, 2) default 0;

-- Comment on columns
comment on column bookings.athlete_id is 'Reference to the athlete from atleta table.';
comment on column bookings.sport_id is 'Reference to the sport from sports table.';
comment on column bookings.price is 'Paid amount for the booking.';

-- Enable RLS (already enabled in initial schema, but ensuring it's on)
alter table bookings enable row level security;

-- Policies for bookings
drop policy if exists "Allow all for bookings" on bookings;
create policy "Allow all for bookings" on bookings for all using (true) with check (true);
