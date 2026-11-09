/**
 * Database schema (PostgreSQL). Every statement is idempotent, so it can run
 * on every cold start. Prices are stored as integer cents; dates and times are
 * stored as plain text ("2026-12-24", "20:30") to avoid time-zone surprises.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_key_at ON rate_limits (key, at);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opening_hours (
  id         SERIAL PRIMARY KEY,
  weekday    INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = domenica
  open_time  TEXT NOT NULL,
  close_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS closures (
  id        SERIAL PRIMARY KEY,
  date_from TEXT NOT NULL,
  date_to   TEXT NOT NULL,
  reason    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reservations (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  date        TEXT NOT NULL,
  time        TEXT NOT NULL,
  party_size  INTEGER NOT NULL CHECK (party_size > 0),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservations_date ON reservations (date, time);

CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER,
  image       TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cake_options (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort        INTEGER NOT NULL DEFAULT 0,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (kind, slug)
);

CREATE TABLE IF NOT EXISTS cake_orders (
  id                TEXT PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'new',
  pickup_date       TEXT NOT NULL,
  pickup_time       TEXT NOT NULL DEFAULT '',
  customer_name     TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  config            JSONB NOT NULL,
  price_breakdown   JSONB NOT NULL,
  total_cents       INTEGER NOT NULL,
  final_price_cents INTEGER,
  preview_images    JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cake_orders_pickup ON cake_orders (pickup_date);

CREATE TABLE IF NOT EXISTS event_requests (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  event_date  TEXT NOT NULL DEFAULT '',
  guests      INTEGER,
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';

ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS cake_reference TEXT NOT NULL DEFAULT '';

-- the language a customer used, so that the e-mails to them speak it
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'it';
ALTER TABLE cake_orders ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'it';
ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'it';

CREATE TABLE IF NOT EXISTS seo_pages (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_log (
  id         TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind       TEXT NOT NULL DEFAULT '',
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  status     TEXT NOT NULL,
  error      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS mail_log_created ON mail_log (created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint     TEXT PRIMARY KEY,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  admin_email  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_ok_at   TIMESTAMPTZ,
  last_error   TEXT NOT NULL DEFAULT ''
);
`;
