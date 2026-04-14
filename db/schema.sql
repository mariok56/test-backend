CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (dashboard accounts — business owners)
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devices (one physical counter unit)
CREATE TABLE devices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token            TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  serial_number           TEXT UNIQUE NOT NULL,
  platform                TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  display_digits          INT NOT NULL DEFAULT 5,
  poll_interval_seconds   INT NOT NULL DEFAULT 6,
  paired_at               TIMESTAMPTZ
);

-- Social accounts (OAuth credentials linked at pairing)
CREATE TABLE social_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         UUID UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  platform_user_id  TEXT NOT NULL,
  username          TEXT NOT NULL,
  access_token      TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ
);

-- Counts (latest value only — one row per device, upserted on every poll)
CREATE TABLE counts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    UUID UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  value        BIGINT NOT NULL DEFAULT 0,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_devices_owner    ON devices(owner_id);
CREATE INDEX idx_devices_token    ON devices(device_token);
CREATE INDEX idx_counts_device    ON counts(device_id);