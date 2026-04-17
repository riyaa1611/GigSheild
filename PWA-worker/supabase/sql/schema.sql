-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE aadhaar_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE platform_type AS ENUM ('zomato', 'swiggy', 'zepto', 'blinkit', 'amazon');
CREATE TYPE plan_type AS ENUM ('basic', 'pro', 'ultra');
CREATE TYPE policy_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE trigger_type AS ENUM ('T-01','T-02','T-03','T-04','T-05','T-06','T-07');
CREATE TYPE claim_status AS ENUM (
  'pending','approved','flagged_secondary','manual_review',
  'paid','payout_failed','rejected'
);
CREATE TYPE payout_status AS ENUM ('pending','processing','success','failed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100),
  aadhaar_status aadhaar_status DEFAULT 'pending',
  aadhaar_number VARCHAR(12),
  platform_id VARCHAR(100),
  platform_type platform_type,
  zone_city VARCHAR(100) DEFAULT 'Mumbai',
  zone_pincode VARCHAR(10) DEFAULT '400070',
  zone_lat DECIMAL(9,6),
  zone_lng DECIMAL(9,6),
  upi_handle VARCHAR(100),
  bank_account VARCHAR(20),
  declared_weekly_earnings DECIMAL(10,2) DEFAULT 4200,
  declared_weekly_hours DECIMAL(5,2) DEFAULT 56,
  loyalty_score INT DEFAULT 100,
  claims_count INT DEFAULT 0,
  total_payout DECIMAL(12,2) DEFAULT 0,
  role VARCHAR(20) DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE otp_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL,
  status policy_status DEFAULT 'active',
  weekly_premium DECIMAL(8,2) NOT NULL,
  adjusted_premium DECIMAL(8,2) NOT NULL,
  coverage_cap DECIMAL(10,2) NOT NULL,
  upi_handle VARCHAR(100),
  premium_multiplier DECIMAL(4,3) DEFAULT 1.000,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  razorpay_subscription_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_policies_user_status ON policies(user_id, status);

CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type trigger_type NOT NULL,
  zone_pincode VARCHAR(10) NOT NULL,
  zone_city VARCHAR(100),
  severity_label VARCHAR(50),
  threshold_value DECIMAL(10,4),
  raw_api_payload JSONB,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  dedupe_key VARCHAR(200) UNIQUE,
  claims_generated INT DEFAULT 0
);
CREATE INDEX idx_triggers_zone_time ON triggers(zone_pincode, triggered_at DESC);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  trigger_id UUID REFERENCES triggers(id),
  status claim_status DEFAULT 'pending',
  hours_disrupted DECIMAL(4,2),
  hourly_rate DECIMAL(8,2),
  payout_amount DECIMAL(10,2),
  fraud_score DECIMAL(4,3),
  fraud_flags JSONB DEFAULT '[]',
  gps_lat DECIMAL(9,6),
  gps_lng DECIMAL(9,6),
  context_validated_at TIMESTAMP WITH TIME ZONE,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_claims_trigger ON claims(trigger_id);
CREATE INDEX idx_claims_user ON claims(user_id, created_at DESC);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES claims(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status payout_status DEFAULT 'pending',
  upi_handle VARCHAR(100),
  razorpay_payout_id VARCHAR(100),
  attempt_count INT DEFAULT 0,
  failure_reason TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_payouts_user ON payouts(user_id, created_at DESC);
CREATE INDEX idx_payouts_claim ON payouts(claim_id);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  ticket_ref VARCHAR(20) UNIQUE,
  subject TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid()::uuid);
CREATE POLICY "policies_own" ON policies FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "claims_own" ON claims FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "payouts_own" ON payouts FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "triggers_read" ON triggers FOR SELECT USING (true);
CREATE POLICY "tickets_own" ON support_tickets FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "messages_own" ON support_messages FOR ALL
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()::uuid));

ALTER PUBLICATION supabase_realtime ADD TABLE payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE triggers;
ALTER PUBLICATION supabase_realtime ADD TABLE claims;

INSERT INTO triggers (type, zone_pincode, zone_city, severity_label, threshold_value, triggered_at, expires_at, dedupe_key)
VALUES
  ('T-01', '400070', 'Mumbai', 'Heavy Rain', 78.5, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 hours', 'T-01:400070:demo-1'),
  ('T-03', '110001', 'Delhi', 'Severe AQI', 342, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 'T-03:110001:demo-1');
