create extension if not exists pgcrypto;

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  external_call_id text not null unique,
  transcript text not null,
  started_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  provider text,
  provider_record_id text,
  phone_number_id text,
  assistant_id text,
  provider_status text,
  ended_reason text,
  provider_created_at timestamptz,
  ended_at timestamptz,
  received_at timestamptz,
  text_file text,
  report jsonb,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'failed')),
  processing_error text,
  record_type text check (record_type is null or record_type in ('incident', 'information')),
  incident_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calls add column if not exists processing_error text;
alter table public.calls add column if not exists provider text;
alter table public.calls add column if not exists provider_record_id text;
alter table public.calls add column if not exists phone_number_id text;
alter table public.calls add column if not exists assistant_id text;
alter table public.calls add column if not exists provider_status text;
alter table public.calls add column if not exists ended_reason text;
alter table public.calls add column if not exists provider_created_at timestamptz;
alter table public.calls add column if not exists ended_at timestamptz;
alter table public.calls add column if not exists received_at timestamptz;
alter table public.calls add column if not exists text_file text;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  category text not null,
  subtype text not null,
  summary text not null,
  location jsonb not null,
  observations jsonb not null default '{}'::jsonb,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'calls_incident_id_fkey') then
    alter table public.calls add constraint calls_incident_id_fkey
      foreign key (incident_id) references public.incidents(id) on delete set null;
  end if;
end $$;
create index if not exists calls_created_at_idx on public.calls(created_at desc);
create index if not exists calls_record_type_idx on public.calls(record_type);
create index if not exists calls_provider_call_idx on public.calls(provider, external_call_id);
create index if not exists incidents_status_created_at_idx on public.incidents(status, created_at desc);
create index if not exists incidents_category_idx on public.incidents(category);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at before update on public.calls for each row execute function public.set_updated_at();
drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at before update on public.incidents for each row execute function public.set_updated_at();

-- Operator dashboard: structured transcript + caller info on calls.
alter table public.calls add column if not exists caller_phone text;
alter table public.calls add column if not exists messages jsonb not null default '[]'::jsonb;

-- Operator dashboard: title/priority/assignee on incidents.
alter table public.incidents add column if not exists title text not null default '';
alter table public.incidents add column if not exists priority text not null default 'medium';
alter table public.incidents add column if not exists assignee text;

alter table public.incidents drop constraint if exists incidents_priority_check;
alter table public.incidents add constraint incidents_priority_check
  check (priority in ('critical', 'high', 'medium', 'low'));

-- Operator dashboard: fixed category taxonomy so category chip colors are always correct.
-- Run before the title backfill below so backfilled titles use the new category label.
update public.incidents set category = 'pothole'
where category in ('roads', 'transportation') and (subtype ilike '%pothole%' or summary ilike '%pothole%');
update public.incidents set category = 'other' where category not in
  ('pothole', 'water', 'tree', 'dumping', 'streetlight', 'noise', 'graffiti', 'vehicle', 'other');

alter table public.incidents drop constraint if exists incidents_category_check;
alter table public.incidents add constraint incidents_category_check
  check (category in ('pothole', 'water', 'tree', 'dumping', 'streetlight', 'noise', 'graffiti', 'vehicle', 'other'));

update public.incidents set title =
  initcap(replace(category, '-', ' ')) || ' — ' || coalesce(nullif(location->>'raw', ''), replace(subtype, '-', ' '))
where title = '';

-- Operator dashboard: fuller status vocabulary (new/in_review/assigned/resolved/dismissed).
update public.incidents set status = 'new' where status = 'pending';
update public.incidents set status = 'assigned' where status = 'approved';

alter table public.incidents drop constraint if exists incidents_status_check;
alter table public.incidents add constraint incidents_status_check
  check (status in ('new', 'in_review', 'assigned', 'resolved', 'dismissed'));
alter table public.incidents alter column status set default 'new';
