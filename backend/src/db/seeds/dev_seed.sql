-- =============================================================
-- GigShield — Development Seed Data
-- File: backend/src/db/seeds/dev_seed.sql
-- Run via: make seed  OR  node src/db/seed.js
-- WARNING: For development only. NEVER run on production.
-- =============================================================

-- ── Truncate in dependency order ──────────────────────────────
TRUNCATE payouts, claims, triggers, policies, users RESTART IDENTITY CASCADE;

-- =============================================================
-- 1. USERS — 5 workers + 1 admin
-- Password hash = bcrypt('Test@1234', 10)
-- =============================================================

INSERT INTO users (
  id, phone, aadhaar_status, platform_id, platform_type,
  zone_lat, zone_lng, pincode, upi_handle,
  declared_weekly_earnings, declared_weekly_hours,
  loyalty_score, role, last_gps_ping_at, last_platform_active_at
) VALUES
  -- Worker 1 — Mumbai Andheri West
  (
    'a1000000-0000-0000-0000-000000000001',
    '9876543001', 'verified', 'ZMT-MUM-001', 'zomato',
    19.136450, 72.826553, '400070', 'raju.mane@upi',
    4200, 56, 100, 'worker',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '30 minutes'
  ),
  -- Worker 2 — Delhi Connaught Place
  (
    'a2000000-0000-0000-0000-000000000002',
    '9876543002', 'verified', 'SWG-DEL-002', 'swiggy',
    28.632796, 77.219720, '110001', 'priya.sharma@upi',
    3800, 50, 95, 'worker',
    NOW() - INTERVAL '1 hour 10 minutes',
    NOW() - INTERVAL '55 minutes'
  ),
  -- Worker 3 — Ahmedabad Navrangpura
  (
    'a3000000-0000-0000-0000-000000000003',
    '9876543003', 'verified', 'ZPT-AHM-003', 'zepto',
    23.033863, 72.585022, '380015', 'arjun.patel@upi',
    5000, 60, 100, 'worker',
    NOW() - INTERVAL '20 minutes',
    NOW() - INTERVAL '15 minutes'
  ),
  -- Worker 4 — Bangalore Koramangala
  (
    'a4000000-0000-0000-0000-000000000004',
    '9876543004', 'verified', 'ZMT-BLR-004', 'zomato',
    12.934533, 77.626579, '560001', 'divya.kumar@upi',
    4600, 58, 88, 'worker',
    NOW() - INTERVAL '3 hours',   -- > 2hr: not eligible for auto-approve today
    NOW() - INTERVAL '2 hours 30 minutes'
  ),
  -- Worker 5 — Chennai T. Nagar
  (
    'a5000000-0000-0000-0000-000000000005',
    '9876543005', 'verified', 'BLK-CHN-005', 'blinkit',
    13.034530, 80.231621, '600001', 'murugan.r@upi',
    3600, 52, 100, 'worker',
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '5 minutes'
  ),
  -- Admin
  (
    'a9990000-0000-0000-0000-000000000099',
    '9999999999', 'verified', NULL, NULL,
    NULL, NULL, NULL, NULL,
    0, 0, 100, 'admin',
    NOW(), NOW()
  );

-- =============================================================
-- 2. POLICIES — 1 active policy per worker
-- basic=₹29/wk, ₹1200 cap | pro=₹49/wk, ₹2500 cap | ultra=₹79/wk, ₹4500 cap
-- =============================================================

INSERT INTO policies (
  id, user_id, plan_type, weekly_premium, coverage_cap, hourly_rate,
  status, start_at, ends_at, ml_premium_multiplier
) VALUES
  -- Worker 1 — Basic
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'basic', 29.00, 1200.00, 75.00,
    'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 1.00
  ),
  -- Worker 2 — Pro
  (
    'b2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    'pro', 49.00, 2500.00, 100.00,
    'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 0.95
  ),
  -- Worker 3 — Ultra
  (
    'b3000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    'ultra', 79.00, 4500.00, 130.00,
    'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 1.10
  ),
  -- Worker 4 — Pro
  (
    'b4000000-0000-0000-0000-000000000004',
    'a4000000-0000-0000-0000-000000000004',
    'pro', 49.00, 2500.00, 100.00,
    'active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 1.05
  ),
  -- Worker 5 — Basic
  (
    'b5000000-0000-0000-0000-000000000005',
    'a5000000-0000-0000-0000-000000000005',
    'basic', 29.00, 1200.00, 75.00,
    'active', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days', 0.90
  );

-- =============================================================
-- 3. TRIGGERS — 3 sample events
--    T-01 Mumbai (rain) | T-03 Delhi (AQI) | T-05 Ahmedabad (curfew)
-- =============================================================

INSERT INTO triggers (
  id, type, zone_pincode, severity, threshold_value, actual_value,
  data_source, triggered_at, expires_at, dedupe_key, raw_api_payload
) VALUES
  -- T-01 Heavy Rain — Mumbai 400070
  (
    'c1000000-0000-0000-0000-000000000001',
    'T-01', '400070', 'high', 64.00, 87.50,
    'OpenWeatherMap',
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '4 hours',
    'T-01:400070:' || to_char(NOW() - INTERVAL '2 hours', 'YYYYMMDD-HH24'),
    '{"weather":[{"main":"Rain","description":"heavy intensity rain"}],"rain":{"1h":87.5},"main":{"temp":27.3,"humidity":94}}'::jsonb
  ),
  -- T-03 Severe AQI — Delhi 110001
  (
    'c2000000-0000-0000-0000-000000000002',
    'T-03', '110001', 'critical', 300.00, 412.00,
    'CPCB-AQI',
    NOW() - INTERVAL '5 hours',
    NOW() + INTERVAL '7 hours',
    'T-03:110001:' || to_char(NOW() - INTERVAL '5 hours', 'YYYYMMDD-HH24'),
    '{"station":"Delhi-ITO","aqi":412,"pollutant":"PM2.5","value":189.4,"category":"Severe"}'::jsonb
  ),
  -- T-05 Curfew — Ahmedabad 380015
  (
    'c3000000-0000-0000-0000-000000000003',
    'T-05', '380015', 'high', 1.00, 1.00,
    'NewsAPI',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '11 hours',
    'T-05:380015:' || to_char(NOW() - INTERVAL '1 hour', 'YYYYMMDD'),
    '{"source":"Times of India","headline":"Section 144 imposed in Navrangpura, Ahmedabad","url":"https://example.com/curfew-ahm"}'::jsonb
  );

-- =============================================================
-- 4. CLAIMS — 5 samples across all statuses
-- =============================================================

INSERT INTO claims (
  id, user_id, policy_id, trigger_id,
  hours_disrupted, hourly_rate, payout_amount, fraud_score, status,
  context_validated_at, gps_lat, gps_lng,
  gps_zone_match, last_ping_within_2hr, platform_active,
  auto_approved_at, created_at
) VALUES
  -- Claim 1: Worker 1 (Mumbai T-01) → approved (auto)
  (
    'd1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    4.50, 75.00, 337.50, 0.08, 'approved',
    NOW() - INTERVAL '1 hour 55 minutes',
    19.136400, 72.826500, TRUE, TRUE, TRUE,
    NOW() - INTERVAL '1 hour 55 minutes',
    NOW() - INTERVAL '2 hours'
  ),
  -- Claim 2: Worker 2 (Delhi T-03) → paid
  (
    'd2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000002',
    'c2000000-0000-0000-0000-000000000002',
    6.00, 100.00, 600.00, 0.12, 'paid',
    NOW() - INTERVAL '4 hours 30 minutes',
    28.632700, 77.219600, TRUE, TRUE, TRUE,
    NOW() - INTERVAL '4 hours 30 minutes',
    NOW() - INTERVAL '5 hours'
  ),
  -- Claim 3: Worker 3 (Ahmedabad T-05) → manual_review (high fraud score)
  (
    'd3000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    'b3000000-0000-0000-0000-000000000003',
    'c3000000-0000-0000-0000-000000000003',
    8.00, 130.00, 1040.00, 0.74, 'manual_review',
    NOW() - INTERVAL '45 minutes',
    23.033800, 72.584900, TRUE, TRUE, FALSE,  -- platform NOT active → suspicious
    NULL,
    NOW() - INTERVAL '1 hour'
  ),
  -- Claim 4: Worker 5 (Chennai, reusing Mumbai T-01 trigger for demo)
  (
    'd4000000-0000-0000-0000-000000000004',
    'a5000000-0000-0000-0000-000000000005',
    'b5000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000001',  -- different zone, still valid for testing
    3.00, 75.00, 225.00, 0.05, 'paid',
    NOW() - INTERVAL '1 hour 40 minutes',
    13.034500, 80.231600, TRUE, TRUE, TRUE,
    NOW() - INTERVAL '1 hour 40 minutes',
    NOW() - INTERVAL '2 hours'
  ),
  -- Claim 5: Worker 4 (Bangalore) → flagged_secondary (medium fraud score)
  (
    'd5000000-0000-0000-0000-000000000005',
    'a4000000-0000-0000-0000-000000000004',
    'b4000000-0000-0000-0000-000000000004',
    'c2000000-0000-0000-0000-000000000002',
    5.00, 100.00, 500.00, 0.48, 'flagged_secondary',
    NOW() - INTERVAL '2 hours 30 minutes',
    12.934400, 77.626400, FALSE, FALSE, TRUE,  -- GPS off-zone, ping >2hr
    NULL,
    NOW() - INTERVAL '3 hours'
  );

-- =============================================================
-- 5. PAYOUTS — 3 samples (2 success, 1 failed)
-- =============================================================

INSERT INTO payouts (
  id, claim_id, user_id, amount, status,
  razorpay_payout_id, upi_handle,
  attempt_count, paid_at, failure_reason, created_at
) VALUES
  -- Payout 1: Claim 2 → success
  (
    'e1000000-0000-0000-0000-000000000001',
    'd2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    600.00, 'success',
    'pout_DEMO_RZP_001', 'priya.sharma@upi',
    1, NOW() - INTERVAL '4 hours', NULL,
    NOW() - INTERVAL '4 hours 25 minutes'
  ),
  -- Payout 2: Claim 4 → success
  (
    'e2000000-0000-0000-0000-000000000002',
    'd4000000-0000-0000-0000-000000000004',
    'a5000000-0000-0000-0000-000000000005',
    225.00, 'success',
    'pout_DEMO_RZP_002', 'murugan.r@upi',
    1, NOW() - INTERVAL '1 hour 30 minutes', NULL,
    NOW() - INTERVAL '1 hour 35 minutes'
  ),
  -- Payout 3: Claim 1 (approved but payout initially failed, now in retry)
  (
    'e3000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    337.50, 'failed',
    NULL, 'raju.mane@upi',
    2, NULL, 'UPI handle not linked to any bank account',
    NOW() - INTERVAL '1 hour 50 minutes'
  );

-- =============================================================
-- 6. ANALYTICS SNAPSHOT — yesterday's snapshot for demo charts
-- =============================================================

INSERT INTO analytics_snapshots (
  snapshot_date, active_users, claims_count,
  auto_approved_count, manual_review_count, rejected_count,
  total_paid_out, total_premiums, loss_ratio,
  avg_payout_time_minutes, avg_fraud_score
) VALUES
  (
    CURRENT_DATE - INTERVAL '1 day',
    5, 5, 2, 1, 0,
    825.00, 255.00, 3.24,    -- high loss ratio in dev is expected
    8.5, 0.29
  );
