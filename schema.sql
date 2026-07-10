-- Tirenify email validation + subscription schema
-- Run this in the Supabase SQL editor (no migration tooling exists in this
-- repo — this project talks to Supabase only via the REST/service-role
-- client, so schema changes must be applied manually).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  validation_status text not null default 'unknown', -- 'valid' | 'invalid' | 'unknown'
  confirmation_token text,
  confirmed_at timestamptz,
  date_subscribed timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_confirmation_token on users (confirmation_token);

-- ─────────────────────────────────────────────────────────────
-- subscriptions
-- ─────────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  breach_alerts boolean not null default true,
  product_updates boolean not null default true,
  security_tips boolean not null default true,
  status text not null default 'pending', -- 'pending' | 'active' | 'unsubscribed'
  subscribed_at timestamptz,
  unsubscribed_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────
-- email_logs
-- ─────────────────────────────────────────────────────────────
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  recipient_email text not null,
  email_type text not null, -- 'welcome' | 'confirmation' | 'newsletter'
  subject text,
  sent_date timestamptz,
  status text not null, -- 'sent' | 'failed' | 'queued'
  resend_message_id text,
  opened boolean not null default false,
  error_message text,
  campaign_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_logs_user_id on email_logs (user_id);

-- ─────────────────────────────────────────────────────────────
-- validation_attempts (audit log for every /api/email/validate call,
-- including emails that never become a subscriber/user row)
-- ─────────────────────────────────────────────────────────────
create table if not exists validation_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_valid boolean not null,
  deliverability text,
  reason text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_validation_attempts_email on validation_attempts (email);
