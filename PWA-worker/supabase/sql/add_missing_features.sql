-- ─── Worker heartbeat (for context validation) ───────────────────────────────
CREATE TABLE IF NOT EXISTS worker_pings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  zone_pincode VARCHAR(10),
  platform_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE worker_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ping_own" ON worker_pings FOR ALL USING (user_id = auth.uid()::uuid);

-- ─── Premium billing history ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS premium_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  amount DECIMAL(8,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'success', -- success | failed | refunded
  billing_date DATE NOT NULL,
  razorpay_payment_id VARCHAR(100),
  plan_type VARCHAR(20),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE premium_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "payments_own" ON premium_payments FOR ALL USING (user_id = auth.uid()::uuid);
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS premium_payments;

-- ─── Referral tracking ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id),
  referred_phone VARCHAR(15),
  referred_user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending | activated | rewarded
  reward_amount DECIMAL(8,2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "referrals_own" ON referrals FOR ALL USING (referrer_id = auth.uid()::uuid);

-- ─── Add referral_code column to users ───────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_payout_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_multiplier DECIMAL(4,3) DEFAULT 1.000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_zone_score DECIMAL(4,3) DEFAULT 0.500;

-- ─── Add week_start tracking to policies (for cap enforcement) ───────────────
ALTER TABLE policies ADD COLUMN IF NOT EXISTS current_week_payout DECIMAL(10,2) DEFAULT 0;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS current_week_start DATE;

-- ─── Enable realtime on claims (so worker sees claim status change) ───────────
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS claims;

-- ─── Populate referral codes for existing users ───────────────────────────────
DO $$
BEGIN
  UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 8)) WHERE referral_code IS NULL;
END $$;

-- ─── Function: auto-generate referral code on insert ─────────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON users;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
