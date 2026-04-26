-- Project Tanit - Schema v1
-- Run in Supabase Dashboard -> SQL Editor

create extension if not exists "uuid-ossp";

create table if not exists institutions (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name_fr text not null,
  name_ar text,
  acronym text,
  governorate text,
  lat double precision,
  lon double precision,
  type text,
  website text,
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade,
  period text not null,
  status text not null default 'pending',
  submitted_at timestamptz,
  domain text,
  created_at timestamptz default now()
);

create table if not exists kpis (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade,
  domain text not null,
  metric text not null,
  value double precision not null,
  period text not null,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists validations (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid references submissions(id) on delete cascade,
  status text not null,
  issues jsonb default '[]',
  checked_at timestamptz default now()
);

create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade,
  metric text not null,
  severity text not null default 'warning',
  message text not null,
  value double precision,
  threshold double precision,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor text,
  action text not null,
  target text,
  details text,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade,
  period text not null,
  type text not null default 'RAP',
  content text,
  generated_at timestamptz default now()
);

create index if not exists idx_kpis_institution on kpis(institution_id);
create index if not exists idx_kpis_domain on kpis(domain);
create index if not exists idx_kpis_period on kpis(period);
create index if not exists idx_submissions_institution on submissions(institution_id);
create index if not exists idx_submissions_period on submissions(period);
create index if not exists idx_alerts_resolved on alerts(resolved);

alter table submissions
  add constraint submissions_institution_period_unique unique (institution_id, period);

create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id),
  metric text not null,
  current_value double precision,
  trend_data jsonb,
  trend_years jsonb,
  predicted_value double precision,
  predicted_period text,
  confidence double precision,
  message text,
  created_at timestamptz default now()
);

create index if not exists idx_predictions_institution on predictions(institution_id);
create index if not exists idx_predictions_confidence on predictions(confidence);
