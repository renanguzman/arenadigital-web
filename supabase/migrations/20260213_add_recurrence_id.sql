-- Add recurrence_id to bookings table
alter table bookings
add column if not exists recurrence_id uuid;

-- Index for better performance when searching for recurring bookings
create index if not exists bookings_recurrence_id_idx on bookings(recurrence_id);

-- Comment on column
comment on column bookings.recurrence_id is 'Identifier to group recurring bookings created together.';
