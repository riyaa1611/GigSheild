require('dotenv').config();
const { query } = require('./index');

const runMigrations = async () => {
  console.log('Running database migrations...');

  // zones table
  await query(`
    CREATE TABLE IF NOT EXISTS zones (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
      risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
      flood_prone BOOLEAN NOT NULL DEFAULT false,
      monsoon_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
      lat NUMERIC(10,6),
      lon NUMERIC(10,6),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // workers table
  await query(`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
      zone_id INTEGER REFERENCES zones(id),
      platform VARCHAR(20) NOT NULL CHECK (platform IN ('zomato', 'swiggy', 'both')),
      weekly_income NUMERIC(10,2) NOT NULL,
      aadhaar_mock VARCHAR(12),
      is_verified BOOLEAN NOT NULL DEFAULT false,
      upi_id VARCHAR(100),
      bank_account_mock VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // admins table
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // policies table
  await query(`
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      weekly_premium NUMERIC(10,2) NOT NULL,
      coverage_amount NUMERIC(10,2) NOT NULL,
      covered_triggers TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // claims table
  await query(`
    CREATE TABLE IF NOT EXISTS claims (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      policy_id INTEGER NOT NULL REFERENCES policies(id),
      trigger_type VARCHAR(50) NOT NULL,
      disruption_date DATE NOT NULL,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      hours_lost NUMERIC(4,2) NOT NULL DEFAULT 0,
      payout_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'flagged')),
      auto_generated BOOLEAN NOT NULL DEFAULT true,
      fraud_flag BOOLEAN NOT NULL DEFAULT false,
      fraud_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );
  `);

  // disruptions table
  await query(`
    CREATE TABLE IF NOT EXISTS disruptions (
      id SERIAL PRIMARY KEY,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      trigger_type VARCHAR(50) NOT NULL,
      trigger_value NUMERIC(10,2),
      threshold_value NUMERIC(10,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // payouts table
  await query(`
    CREATE TABLE IF NOT EXISTS payouts (
      id SERIAL PRIMARY KEY,
      claim_id INTEGER NOT NULL REFERENCES claims(id),
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
      payment_method VARCHAR(50) NOT NULL DEFAULT 'upi',
      transaction_id VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);

  // zone_risk_history table
  await query(`
    CREATE TABLE IF NOT EXISTS zone_risk_history (
      id SERIAL PRIMARY KEY,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      avg_rainfall_mm NUMERIC(8,2) NOT NULL DEFAULT 0,
      flood_events INTEGER NOT NULL DEFAULT 0,
      extreme_heat_days INTEGER NOT NULL DEFAULT 0,
      avg_aqi NUMERIC(8,2) NOT NULL DEFAULT 0,
      UNIQUE(zone_id, month, year)
    );
  `);

  console.log('Migrations completed successfully.');
};

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
