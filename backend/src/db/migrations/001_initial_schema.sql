-- =============================================================
-- GigShield — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Run via: make migrate  OR  node src/db/migrate.js
-- =============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search on fraud monitor

-- ── ENUM Types ────────────────────────────────────────────────
CREATE TYPE aadhaar_status  AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE platform_type   AS ENUM ('zomato', 'swiggy', 'zepto', 'blinkit', 'amazon');
CREATE TYPE plan_type       AS ENUM ('basic', 'pro', 'ultra');
CREATE TYPE policy_status   AS ENUM ('active', 'suspended', 'cancelled');

CREATE TYPE trigger_type    AS ENUM (
  'T-01',  -- Heavy Rain        (rain > 64 mm/hr)
  'T-02',  -- Extreme Heat      (temp > 42 °C)
  'T-03',  -- Severe AQI        (AQI > 300)
  'T-04',  -- Flood / Waterlog  (flood depth > 0.3 m)
  'T-05',  -- Curfew / Section  (news + govt. API)
  'T-06',  -- Platform Outage   (delivery API 5xx > 30 min)
  'T-07'   -- Cyclone / Storm   (wind > 90 km/h)
);

CREATE TYPE claim_status    AS ENUM (
  'pending',
  'approved',
  'flagged_secondary',   -- fraud score 0.3–0.7, secondary check in progress
  'manual_review',       -- fraud score > 0.7, admin queue
  'paid',
  'payout_failed',
  'rejected'
);

CREATE TYPE payout_status   AS ENUM ('pending', 'processing', 'success', 'failed');

-- =============================================================
-- TABLES
-- =============================================================

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone                     VARCHAR(15) UNIQUE NOT NULL,
  aadhaar_status            aadhaar_status  NOT NULL DEFAULT 'pending',
  platform_id               VARCHAR(100),
  platform_type             platform_type,
  zone_lat                  DECIMAL(9,6),
  zone_lng                  DECIMAL(9,6),
  pincode                   VARCHAR(10),
  device_fingerprint        TEXT,
  upi_handle                VARCHAR(100),
  razorpay_fund_account_id  VARCHAR(100),              -- for instant UPI payouts
  declared_weekly_earnings  DECIMAL(10,2) DEFAULT 4200,
  declared_weekly_hours     DECIMAL(5,2)  DEFAULT 56,
  loyalty_score             INT           DEFAULT 100,
  role                      VARCHAR(20)   DEFAULT 'worker'
                              CHECK (role IN ('worker', 'admin')),
  last_gps_ping_at          TIMESTAMP,
  last_gps_lat              DECIMAL(9,6),
  last_gps_lng              DECIMAL(9,6),
  last_platform_active_at   TIMESTAMP,
  created_at                TIMESTAMP     DEFAULT NOW()
);

COMMENT ON COLUMN users.loyalty_score IS
  'Starts at 100. Decremented on fraud flags, never goes negative.';

-- ── policies ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type                 plan_type     NOT NULL,
  weekly_premium            DECIMAL(8,2)  NOT NULL,
  coverage_cap              DECIMAL(10,2) NOT NULL,
  hourly_rate               DECIMAL(8,2)  NOT NULL,  -- earnings per hour for payout calc
  status                    policy_status NOT NULL DEFAULT 'active',
  billing_day               INT           DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 7),
  start_at                  TIMESTAMP     NOT NULL DEFAULT NOW(),
  ends_at                   TIMESTAMP,
  razorpay_subscription_id  VARCHAR(100),
  ml_premium_multiplier     DECIMAL(4,2)  DEFAULT 1.00,  -- XGBoost output, range 0.7–1.3
  created_at                TIMESTAMP     DEFAULT NOW()
);

-- ── triggers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triggers (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  type             trigger_type  NOT NULL,
  zone_pincode     VARCHAR(10)   NOT NULL,
  severity         VARCHAR(20)   NOT NULL DEFAULT 'medium'
                     CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  threshold_value  DECIMAL(10,2),
  actual_value     DECIMAL(10,2),
  data_source      VARCHAR(100),
  triggered_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMP,
  raw_api_payload  JSONB,                   -- full API response for audit
  dedupe_key       VARCHAR(200)  UNIQUE     -- Redis TTL-30min mirror, prevents re-trigger
);

COMMENT ON COLUMN triggers.raw_api_payload IS
  'Full JSON response from weather/AQI/news API stored for audit & ML retraining.';

-- ── claims ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES users(id),
  policy_id             UUID          NOT NULL REFERENCES policies(id),
  trigger_id            UUID          NOT NULL REFERENCES triggers(id),
  hours_disrupted       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  hourly_rate           DECIMAL(8,2)  NOT NULL,
  payout_amount         DECIMAL(10,2) NOT NULL,
  fraud_score           DECIMAL(5,4)  NOT NULL DEFAULT 0.0,
  status                claim_status  NOT NULL DEFAULT 'pending',
  context_validated_at  TIMESTAMP,
  gps_lat               DECIMAL(9,6),
  gps_lng               DECIMAL(9,6),
  gps_zone_match        BOOLEAN       DEFAULT FALSE,
  last_ping_within_2hr  BOOLEAN       DEFAULT FALSE,
  platform_active       BOOLEAN       DEFAULT FALSE,
  auto_approved_at      TIMESTAMP,
  reviewed_by           UUID          REFERENCES users(id),  -- admin who reviewed
  reviewed_at           TIMESTAMP,
  review_note           TEXT,
  created_at            TIMESTAMP     DEFAULT NOW()
);

-- ── payouts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id             UUID          NOT NULL REFERENCES claims(id),
  user_id              UUID          NOT NULL REFERENCES users(id),
  amount               DECIMAL(10,2) NOT NULL,
  status               payout_status NOT NULL DEFAULT 'pending',
  razorpay_payout_id   VARCHAR(100),
  upi_handle           VARCHAR(100),
  attempt_count        INT           DEFAULT 0,
  paid_at              TIMESTAMP,
  failure_reason       TEXT,
  created_at           TIMESTAMP     DEFAULT NOW()
);

-- ── analytics_snapshots ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date             DATE          UNIQUE NOT NULL,
  active_users              INT           DEFAULT 0,
  claims_count              INT           DEFAULT 0,
  auto_approved_count       INT           DEFAULT 0,
  manual_review_count       INT           DEFAULT 0,
  rejected_count            INT           DEFAULT 0,
  total_paid_out            DECIMAL(12,2) DEFAULT 0,
  total_premiums            DECIMAL(12,2) DEFAULT 0,
  loss_ratio                DECIMAL(6,4)  DEFAULT 0,         -- total_paid / total_premiums
  avg_payout_time_minutes   DECIMAL(8,2)  DEFAULT 0,
  avg_fraud_score           DECIMAL(5,4)  DEFAULT 0,
  captured_at               TIMESTAMP     DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- policies: fast active-policy lookup per zone sweep 
CREATE INDEX IF NOT EXISTS idx_policies_user_status     ON policies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_status_ends     ON policies(status, ends_at);

-- claims: bulk creation per trigger event
CREATE INDEX IF NOT EXISTS idx_claims_trigger           ON claims(trigger_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_status       ON claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_status            ON claims(status);

-- triggers: admin map queries
CREATE INDEX IF NOT EXISTS idx_triggers_zone_time       ON triggers(zone_pincode, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_type_zone       ON triggers(type, zone_pincode);
CREATE INDEX IF NOT EXISTS idx_triggers_dedupe          ON triggers(dedupe_key);

-- payouts: Bull queue retries
CREATE INDEX IF NOT EXISTS idx_payouts_claim            ON payouts(claim_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status           ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_user             ON payouts(user_id);

-- users: pincode-based zone sweep
CREATE INDEX IF NOT EXISTS idx_users_pincode            ON users(pincode);
CREATE INDEX IF NOT EXISTS idx_users_role               ON users(role);

-- analytics: chronological access
CREATE INDEX IF NOT EXISTS idx_analytics_date           ON analytics_snapshots(snapshot_date DESC);

-- =============================================================
-- VIEWS (convenience, used by Analytics Service)
-- =============================================================

CREATE OR REPLACE VIEW v_active_policies AS
  SELECT
    p.id             AS policy_id,
    p.user_id,
    u.pincode,
    u.zone_lat,
    u.zone_lng,
    u.platform_type,
    u.upi_handle,
    u.razorpay_fund_account_id,
    u.last_gps_ping_at,
    u.last_platform_active_at,
    p.plan_type,
    p.coverage_cap,
    p.hourly_rate,
    p.ml_premium_multiplier
  FROM policies p
  JOIN users u ON u.id = p.user_id
  WHERE p.status = 'active'
    AND (p.ends_at IS NULL OR p.ends_at > NOW());

CREATE OR REPLACE VIEW v_payout_analytics AS
  SELECT
    date_trunc('day', py.created_at) AS payout_day,
    COUNT(*)                         AS payout_count,
    SUM(py.amount)                   AS total_amount,
    AVG(py.amount)                   AS avg_amount,
    COUNT(*) FILTER (WHERE py.status = 'success')   AS success_count,
    COUNT(*) FILTER (WHERE py.status = 'failed')    AS failed_count,
    AVG(EXTRACT(EPOCH FROM (py.paid_at - py.created_at)) / 60)
                                     AS avg_minutes_to_pay
  FROM payouts py
  GROUP BY 1
  ORDER BY 1 DESC;
