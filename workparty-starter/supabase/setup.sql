
-- Create table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  artist_name text,
  email text,
  city text,
  title text,
  year text,
  runtime text,
  aspect_ratio text,
  resolution text,
  synopsis text,
  credits text,
  file_path text,
  consent_archive boolean default false,
  status text default 'pending' check (status in ('pending','approved','rejected','archived')),
  order_index int
);

-- Enable RLS
alter table public.submissions enable row level security;

-- Policies
-- Public can read approved or archived rows
create policy "Public read approved and archived"
on public.submissions for select
to anon, authenticated
using (status in ('approved','archived'));

-- Admin service role full access
create policy "Service full access"
on public.submissions for all
to service_role
using (true)
with check (true);

-- Storage bucket
-- Create a bucket named 'videos' in the dashboard Storage section before using.
-- Example Storage policy: authenticated users can upload, public can read
-- For signed uploads route, service role inserts, so no extra policy required here.
