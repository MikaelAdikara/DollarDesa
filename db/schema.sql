-- DETAK event store. Apply once: psql "$DATABASE_URL" -f db/schema.sql
-- Master data (SPPG, sekolah, rencana distribusi) is owned by SIPGN and read through its API;
-- DETAK only stores what it adds: checkpoint readings and actions on a batch.

create extension if not exists pgcrypto;

create table if not exists detak_event (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('reading', 'hold', 'release', 'inspect')),
  service_date date not null,
  batch_id     text not null,
  checkpoint   smallint check (checkpoint between 1 and 4),
  food_c       numeric(4,1) check (food_c between -10 and 110),
  ambient_c    numeric(4,1) check (ambient_c between -10 and 60),
  measured_at  timestamptz,
  reason       text,
  actor        text not null,
  role         text not null check (role in ('sppg', 'sekolah', 'dinas', 'bgn')),
  created_at   timestamptz not null default now(),
  constraint reading_has_values check (
    kind <> 'reading' or (checkpoint is not null and food_c is not null and ambient_c is not null and measured_at is not null)
  )
);

-- Dashboards read one service day at a time; the parent/teacher page reads one batch.
create index if not exists detak_event_by_day   on detak_event (service_date, created_at);
create index if not exists detak_event_by_batch on detak_event (batch_id, created_at);

-- Events are append-only: corrections are new events, never updates.
create or replace function detak_event_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'detak_event is append-only';
end $$;

drop trigger if exists detak_event_no_update on detak_event;
create trigger detak_event_no_update before update or delete on detak_event
  for each row execute function detak_event_immutable();
