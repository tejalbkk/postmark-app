-- Postmark: run this once in Supabase → SQL Editor.

-- 1. Cards table. Only the server (service role) reads and writes it.
create table if not exists public.cards (
  id          text primary key,
  template    text not null,
  bg          text not null default 'blur' check (bg in ('blur', 'wash')),
  to_name     text not null default '' check (char_length(to_name) <= 24),
  from_name   text not null default '' check (char_length(from_name) <= 24),
  message     text not null check (char_length(message) between 1 and 200),
  colors      jsonb not null,
  tz          text,
  photo_path  text not null,
  ratio       real,
  created_at  timestamptz not null default now()
);

-- Already created the table before portrait cards? This adds the photo-shape column (safe to re-run).
alter table public.cards add column if not exists ratio real;

-- Row Level Security on, with no policies: the public anon key can't read or write cards.
alter table public.cards enable row level security;

-- 2. Public bucket for the photos (anyone with a card link can load its photo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('postcards', 'postcards', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
