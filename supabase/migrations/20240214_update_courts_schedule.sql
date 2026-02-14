-- Add day_config column to courts table to store detailed daily schedule and pricing
alter table courts
add column if not exists day_config jsonb default '[]'::jsonb;

-- Comment on column
comment on column courts.day_config is 'Stores configuration for each day: start/end time, default price, and custom hourly prices.';
