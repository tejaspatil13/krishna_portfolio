-- Run once in the Supabase SQL editor.

-- 1. Content document (one row, id = 'main'). Only the server (service role) touches it.
create table if not exists public.site_content (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
-- No policies: anon/authenticated clients get no access; the service-role key bypasses RLS.

-- 2. Public media bucket for reel uploads, with size + type limits enforced by Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  209715200, -- 200 MB; must not exceed your plan's global upload limit
  array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
