-- Alertas Agroclimáticas NutriPlant
-- Solicitudes públicas administradas exclusivamente mediante funciones de servidor.

create extension if not exists pgcrypto;

create table if not exists public.climate_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  request_code varchar(4) not null unique
    check (request_code ~ '^[A-HJ-NP-Z2-9]{4}$'),
  full_name text not null,
  email text not null,
  phone_country_code text not null,
  phone_national text not null,
  phone_e164 text not null,
  occupation text not null
    check (occupation in ('Agrónomo', 'Técnico agrícola', 'Estudiante', 'Agricultor', 'Asesor', 'Otro')),
  country text not null,
  region text not null,
  postal_code text not null,
  crop text not null,
  area_range text not null,
  crop_stage text not null,
  primary_use text not null,
  decision_goal text not null,
  status text not null default 'pending_whatsapp'
    check (status in ('pending_whatsapp', 'pending_review', 'active', 'paused', 'rejected', 'unsubscribed')),
  email_consent boolean not null default false,
  whatsapp_consent boolean not null default false,
  terms_accepted boolean not null default false,
  consent_version text not null default '2026-07-22',
  consented_at timestamptz not null default now(),
  consent_source text not null default 'pronosticoclimatico_web',
  whatsapp_confirmed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  paused_at timestamptz,
  unsubscribed_at timestamptz,
  admin_notes text,
  first_report_access_at timestamptz,
  last_report_access_at timestamptz,
  report_access_count integer not null default 0 check (report_access_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists climate_alert_subscribers_email_lower_uidx
  on public.climate_alert_subscribers (lower(email));
create unique index if not exists climate_alert_subscribers_phone_uidx
  on public.climate_alert_subscribers (phone_e164);
create index if not exists climate_alert_subscribers_status_idx
  on public.climate_alert_subscribers (status, created_at desc);
create index if not exists climate_alert_subscribers_last_access_idx
  on public.climate_alert_subscribers (last_report_access_at);

create table if not exists public.climate_alert_plots (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null unique references public.climate_alert_subscribers(id) on delete cascade,
  plot_name text not null default 'Mi predio',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text,
  kc numeric(5, 3) check (kc is null or (kc >= 0 and kc <= 2.5)),
  kc_source text check (kc_source is null or kc_source in ('manual', 'fao')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists climate_alert_plots_coords_idx
  on public.climate_alert_plots (latitude, longitude);

create table if not exists public.climate_alert_access_tokens (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.climate_alert_subscribers(id) on delete cascade,
  token_hash text not null unique,
  token_kind text not null default 'report' check (token_kind in ('report', 'edit', 'unsubscribe')),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists climate_alert_tokens_subscriber_idx
  on public.climate_alert_access_tokens (subscriber_id, token_kind);

create table if not exists public.climate_alert_snapshots (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.climate_alert_subscribers(id) on delete cascade,
  plot_id uuid not null references public.climate_alert_plots(id) on delete cascade,
  alert_type text not null check (alert_type in ('activation_partial', 'weekly')),
  schedule_key text not null,
  historical_start date,
  historical_end date,
  forecast_start date not null,
  forecast_end date not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text,
  kc numeric(5, 3),
  weather_source text not null default 'Open-Meteo',
  rows jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  unique (plot_id, schedule_key)
);
create index if not exists climate_alert_snapshots_subscriber_idx
  on public.climate_alert_snapshots (subscriber_id, generated_at desc);
create index if not exists climate_alert_snapshots_expiry_idx
  on public.climate_alert_snapshots (expires_at);

create table if not exists public.climate_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.climate_alert_subscribers(id) on delete cascade,
  snapshot_id uuid references public.climate_alert_snapshots(id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'whatsapp_manual')),
  destination text,
  subject text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'temporary_error', 'permanent_error', 'opened_manual')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists climate_alert_deliveries_subscriber_idx
  on public.climate_alert_deliveries (subscriber_id, created_at desc);
create index if not exists climate_alert_deliveries_status_idx
  on public.climate_alert_deliveries (status, created_at);

create table if not exists public.climate_alert_access_events (
  id bigint generated by default as identity primary key,
  subscriber_id uuid not null references public.climate_alert_subscribers(id) on delete cascade,
  snapshot_id uuid references public.climate_alert_snapshots(id) on delete set null,
  accessed_at timestamptz not null default now(),
  user_agent text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists climate_alert_access_events_subscriber_idx
  on public.climate_alert_access_events (subscriber_id, accessed_at desc);

create table if not exists public.climate_alert_events (
  id bigint generated by default as identity primary key,
  subscriber_id uuid references public.climate_alert_subscribers(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'system' check (actor_type in ('visitor', 'subscriber', 'admin', 'system')),
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists climate_alert_events_subscriber_idx
  on public.climate_alert_events (subscriber_id, created_at desc);

create table if not exists public.climate_alert_admin_audit (
  id bigint generated by default as identity primary key,
  subscriber_id uuid references public.climate_alert_subscribers(id) on delete set null,
  admin_user_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists climate_alert_admin_audit_subscriber_idx
  on public.climate_alert_admin_audit (subscriber_id, created_at desc);

create or replace function public.climate_alert_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists climate_alert_subscribers_updated_at on public.climate_alert_subscribers;
create trigger climate_alert_subscribers_updated_at
before update on public.climate_alert_subscribers
for each row execute function public.climate_alert_set_updated_at();

drop trigger if exists climate_alert_plots_updated_at on public.climate_alert_plots;
create trigger climate_alert_plots_updated_at
before update on public.climate_alert_plots
for each row execute function public.climate_alert_set_updated_at();

drop trigger if exists climate_alert_deliveries_updated_at on public.climate_alert_deliveries;
create trigger climate_alert_deliveries_updated_at
before update on public.climate_alert_deliveries
for each row execute function public.climate_alert_set_updated_at();

alter table public.climate_alert_subscribers enable row level security;
alter table public.climate_alert_plots enable row level security;
alter table public.climate_alert_access_tokens enable row level security;
alter table public.climate_alert_snapshots enable row level security;
alter table public.climate_alert_deliveries enable row level security;
alter table public.climate_alert_access_events enable row level security;
alter table public.climate_alert_events enable row level security;
alter table public.climate_alert_admin_audit enable row level security;

-- Sin políticas para anon/authenticated: todo acceso pasa por funciones de servidor
-- con service_role y validación explícita de token o administrador.

create or replace function public.climate_alert_purge_expired()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.climate_alert_snapshots where expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.climate_alert_purge_expired() from public;
grant execute on function public.climate_alert_purge_expired() to service_role;
