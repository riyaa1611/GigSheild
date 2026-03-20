require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./index');
const { runMigrations } = require('./migrations');

const SALT_ROUNDS = 10;

const zones = [
  { name: 'Andheri East',  city: 'Mumbai', risk_level: 'high',    flood_prone: true,  monsoon_multiplier: 1.8, lat: 19.1136, lon: 72.8697 },
  { name: 'Dharavi',       city: 'Mumbai', risk_level: 'extreme', flood_prone: true,  monsoon_multiplier: 2.2, lat: 19.0376, lon: 72.8554 },
  { name: 'Bandra West',   city: 'Mumbai', risk_level: 'medium',  flood_prone: false, monsoon_multiplier: 1.3, lat: 19.0596, lon: 72.8295 },
  { name: 'Kurla',         city: 'Mumbai', risk_level: 'high',    flood_prone: true,  monsoon_multiplier: 1.9, lat: 19.0725, lon: 72.8800 },
  { name: 'Borivali East', city: 'Mumbai', risk_level: 'low',     flood_prone: false, monsoon_multiplier: 1.1, lat: 19.2307, lon: 72.8564 },
];

const workerTemplates = [
  { name: 'Ramesh Yadav',       phone: '9876543210', email: 'ramesh@example.com',   platform: 'zomato', weekly_income: 4200, zone_index: 0, aadhaar_mock: '234567890123', upi_id: 'ramesh@upi',    bank_account_mock: 'SBIN0001234' },
  { name: 'Priya Sharma',       phone: '9876543211', email: 'priya@example.com',    platform: 'swiggy', weekly_income: 3800, zone_index: 0, aadhaar_mock: '345678901234', upi_id: 'priya@upi',     bank_account_mock: 'HDFC0001234' },
  { name: 'Suresh Patil',       phone: '9876543212', email: 'suresh@example.com',   platform: 'both',   weekly_income: 5500, zone_index: 1, aadhaar_mock: '456789012345', upi_id: 'suresh@upi',    bank_account_mock: 'ICIC0001234' },
  { name: 'Meena Gupta',        phone: '9876543213', email: 'meena@example.com',    platform: 'zomato', weekly_income: 3500, zone_index: 1, aadhaar_mock: '567890123456', upi_id: 'meena@upi',     bank_account_mock: 'AXIS0001234' },
  { name: 'Vijay Kumar',        phone: '9876543214', email: 'vijay@example.com',    platform: 'swiggy', weekly_income: 4800, zone_index: 2, aadhaar_mock: '678901234567', upi_id: 'vijay@upi',     bank_account_mock: 'KOTAK001234' },
  { name: 'Anita Desai',        phone: '9876543215', email: 'anita@example.com',    platform: 'both',   weekly_income: 6000, zone_index: 2, aadhaar_mock: '789012345678', upi_id: 'anita@upi',     bank_account_mock: 'YESB0001234' },
  { name: 'Ravi Patel',         phone: '9876543216', email: 'ravi@example.com',     platform: 'zomato', weekly_income: 4000, zone_index: 3, aadhaar_mock: '890123456789', upi_id: 'ravi@upi',      bank_account_mock: 'PNB00001234' },
  { name: 'Sonal Mehta',        phone: '9876543217', email: 'sonal@example.com',    platform: 'swiggy', weekly_income: 3900, zone_index: 3, aadhaar_mock: '901234567890', upi_id: 'sonal@upi',     bank_account_mock: 'BOB00001234' },
  { name: 'Dinesh Chauhan',     phone: '9876543218', email: 'dinesh@example.com',   platform: 'both',   weekly_income: 5200, zone_index: 4, aadhaar_mock: '012345678901', upi_id: 'dinesh@upi',    bank_account_mock: 'CANB001234'  },
  { name: 'Kavita Nair',        phone: '9876543219', email: 'kavita@example.com',   platform: 'zomato', weekly_income: 4100, zone_index: 4, aadhaar_mock: '123456789012', upi_id: 'kavita@upi',    bank_account_mock: 'UBI00001234' },
];

// Risk history: months 1-12 per zone (monsoon-realistic values for Mumbai)
const riskHistoryTemplate = [
  { month: 1,  avg_rainfall_mm:  2.1, flood_events: 0, extreme_heat_days: 0, avg_aqi: 95  },
  { month: 2,  avg_rainfall_mm:  1.5, flood_events: 0, extreme_heat_days: 0, avg_aqi: 90  },
  { month: 3,  avg_rainfall_mm:  0.5, flood_events: 0, extreme_heat_days: 2, avg_aqi: 85  },
  { month: 4,  avg_rainfall_mm:  0.3, flood_events: 0, extreme_heat_days: 5, avg_aqi: 80  },
  { month: 5,  avg_rainfall_mm:  8.2, flood_events: 0, extreme_heat_days: 8, avg_aqi: 75  },
  { month: 6,  avg_rainfall_mm: 62.4, flood_events: 2, extreme_heat_days: 0, avg_aqi: 110 },
  { month: 7,  avg_rainfall_mm: 98.7, flood_events: 5, extreme_heat_days: 0, avg_aqi: 130 },
  { month: 8,  avg_rainfall_mm: 86.5, flood_events: 4, extreme_heat_days: 0, avg_aqi: 125 },
  { month: 9,  avg_rainfall_mm: 45.2, flood_events: 1, extreme_heat_days: 0, avg_aqi: 100 },
  { month: 10, avg_rainfall_mm: 12.3, flood_events: 0, extreme_heat_days: 1, avg_aqi: 105 },
  { month: 11, avg_rainfall_mm:  4.5, flood_events: 0, extreme_heat_days: 0, avg_aqi: 115 },
  { month: 12, avg_rainfall_mm:  2.8, flood_events: 0, extreme_heat_days: 0, avg_aqi: 120 },
];

// Monsoon multiplier adjustments per zone risk level
const riskMultipliers = {
  low:     { rainfall: 0.7, flood: 0.5, heat: 0.8, aqi: 0.9 },
  medium:  { rainfall: 1.0, flood: 1.0, heat: 1.0, aqi: 1.0 },
  high:    { rainfall: 1.4, flood: 1.5, heat: 1.2, aqi: 1.3 },
  extreme: { rainfall: 1.9, flood: 2.5, heat: 1.4, aqi: 1.5 },
};

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const formatDate = (date) => date.toISOString().split('T')[0];

const seed = async () => {
  console.log('Starting seed...');

  await runMigrations();

  // Clear existing data in dependency order
  await query('DELETE FROM payouts');
  await query('DELETE FROM claims');
  await query('DELETE FROM policies');
  await query('DELETE FROM disruptions');
  await query('DELETE FROM zone_risk_history');
  await query('DELETE FROM workers');
  await query('DELETE FROM admins');
  await query('DELETE FROM zones');
  console.log('Cleared existing data.');

  // Seed zones
  const zoneIds = [];
  for (const zone of zones) {
    const res = await query(
      `INSERT INTO zones (name, city, risk_level, flood_prone, monsoon_multiplier, lat, lon)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [zone.name, zone.city, zone.risk_level, zone.flood_prone, zone.monsoon_multiplier, zone.lat, zone.lon]
    );
    zoneIds.push(res.rows[0].id);
  }
  console.log(`Seeded ${zoneIds.length} zones.`);

  // Seed zone risk history
  for (let zi = 0; zi < zones.length; zi++) {
    const zone = zones[zi];
    const mult = riskMultipliers[zone.risk_level];
    for (const row of riskHistoryTemplate) {
      await query(
        `INSERT INTO zone_risk_history (zone_id, month, year, avg_rainfall_mm, flood_events, extreme_heat_days, avg_aqi)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (zone_id, month, year) DO NOTHING`,
        [
          zoneIds[zi],
          row.month,
          2025,
          parseFloat((row.avg_rainfall_mm * mult.rainfall).toFixed(2)),
          Math.round(row.flood_events * mult.flood),
          Math.round(row.extreme_heat_days * mult.heat),
          parseFloat((row.avg_aqi * mult.aqi).toFixed(2)),
        ]
      );
    }
  }
  console.log('Seeded zone risk history.');

  // Seed admin
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  await query(
    `INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)`,
    ['GigShield Admin', 'admin@gigshield.in', adminHash]
  );
  console.log('Seeded admin user: admin@gigshield.in / admin123');

  // Seed workers
  const defaultPassword = await bcrypt.hash('worker123', SALT_ROUNDS);
  const workerIds = [];
  for (const w of workerTemplates) {
    const zoneId = zoneIds[w.zone_index];
    const res = await query(
      `INSERT INTO workers (name, phone, email, password_hash, city, zone_id, platform, weekly_income,
        aadhaar_mock, is_verified, upi_id, bank_account_mock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [w.name, w.phone, w.email, defaultPassword, 'Mumbai', zoneId, w.platform,
       w.weekly_income, w.aadhaar_mock, true, w.upi_id, w.bank_account_mock]
    );
    workerIds.push({ id: res.rows[0].id, zone_id: zoneId, weekly_income: w.weekly_income });
  }
  console.log(`Seeded ${workerIds.length} workers.`);

  // Seed policies (current week active + one previous inactive per worker)
  const today = new Date();
  const thisMonday = getMonday(today);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisSunday.getDate() + 6);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);

  const allTriggers = ['heavy_rain', 'extreme_heat', 'severe_aqi', 'flood_alert', 'curfew'];
  const policyIds = [];

  for (let i = 0; i < workerIds.length; i++) {
    const w = workerIds[i];
    const premium = parseFloat((w.weekly_income * 0.02).toFixed(2));
    const coverage = parseFloat((w.weekly_income * 2.5).toFixed(2));

    // Active policy (this week)
    const activeRes = await query(
      `INSERT INTO policies (worker_id, zone_id, status, week_start, week_end,
        weekly_premium, coverage_amount, covered_triggers)
       VALUES ($1,$2,'active',$3,$4,$5,$6,$7) RETURNING id`,
      [w.id, w.zone_id, formatDate(thisMonday), formatDate(thisSunday),
       premium, coverage, allTriggers]
    );
    policyIds.push({ id: activeRes.rows[0].id, worker_id: w.id, zone_id: w.zone_id, weekly_income: w.weekly_income });

    // Inactive policy (last week)
    await query(
      `INSERT INTO policies (worker_id, zone_id, status, week_start, week_end,
        weekly_premium, coverage_amount, covered_triggers)
       VALUES ($1,$2,'inactive',$3,$4,$5,$6,$7)`,
      [w.id, w.zone_id, formatDate(lastMonday), formatDate(lastSunday),
       premium, coverage, allTriggers]
    );
  }
  console.log(`Seeded ${policyIds.length} active policies (plus ${policyIds.length} inactive).`);

  // Seed a sample disruption (last week, zone 0 - Andheri East)
  const disruption1Date = new Date(lastMonday);
  disruption1Date.setDate(disruption1Date.getDate() + 2); // Wednesday last week
  const disruptionRes = await query(
    `INSERT INTO disruptions (zone_id, trigger_type, trigger_value, threshold_value, is_active, started_at, ended_at)
     VALUES ($1, 'heavy_rain', 72.5, 50.0, false, $2, $3) RETURNING id`,
    [zoneIds[0], disruption1Date.toISOString(), new Date(disruption1Date.getTime() + 8 * 3600000).toISOString()]
  );
  const disruptionId = disruptionRes.rows[0].id;

  // Seed historical claims for workers in zone 0 (Andheri East)
  const zone0Workers = policyIds.filter((p) => p.zone_id === zoneIds[0]);
  const claimIds = [];
  for (const pol of zone0Workers) {
    const hoursLost = 5.5;
    const payout = parseFloat(((pol.weekly_income / 7) * (hoursLost / 8)).toFixed(2));
    const claimRes = await query(
      `INSERT INTO claims (worker_id, policy_id, trigger_type, disruption_date, zone_id,
        hours_lost, payout_amount, status, auto_generated, fraud_flag, paid_at)
       VALUES ($1,$2,'heavy_rain',$3,$4,$5,$6,'paid',true,false,$7) RETURNING id`,
      [pol.worker_id, pol.id, formatDate(disruption1Date), pol.zone_id,
       hoursLost, payout, new Date(disruption1Date.getTime() + 24 * 3600000).toISOString()]
    );
    claimIds.push({ id: claimRes.rows[0].id, worker_id: pol.worker_id, payout });
  }

  // Seed a second disruption in Dharavi (extreme zone) - flood
  const disruption2Date = new Date(lastMonday);
  disruption2Date.setDate(disruption2Date.getDate() + 4); // Friday last week
  const disruptionRes2 = await query(
    `INSERT INTO disruptions (zone_id, trigger_type, trigger_value, threshold_value, is_active, started_at, ended_at)
     VALUES ($1, 'flood_alert', 1, 1, false, $2, $3) RETURNING id`,
    [zoneIds[1], disruption2Date.toISOString(), new Date(disruption2Date.getTime() + 12 * 3600000).toISOString()]
  );

  const zone1Workers = policyIds.filter((p) => p.zone_id === zoneIds[1]);
  for (const pol of zone1Workers) {
    const hoursLost = 8.0;
    const payout = parseFloat(((pol.weekly_income / 7) * (hoursLost / 8)).toFixed(2));
    const claimRes = await query(
      `INSERT INTO claims (worker_id, policy_id, trigger_type, disruption_date, zone_id,
        hours_lost, payout_amount, status, auto_generated, fraud_flag)
       VALUES ($1,$2,'flood_alert',$3,$4,$5,$6,'approved',true,false) RETURNING id`,
      [pol.worker_id, pol.id, formatDate(disruption2Date), pol.zone_id, hoursLost, payout]
    );
    claimIds.push({ id: claimRes.rows[0].id, worker_id: pol.worker_id, payout });
  }

  console.log(`Seeded ${claimIds.length} historical claims.`);

  // Seed payouts for paid claims (zone 0 claims)
  for (const c of claimIds.slice(0, zone0Workers.length)) {
    const txId = `TXN_MOCK_${Date.now()}_${c.id}`;
    await query(
      `INSERT INTO payouts (claim_id, worker_id, amount, status, payment_method, transaction_id, completed_at)
       VALUES ($1,$2,$3,'completed','upi',$4, NOW())`,
      [c.id, c.worker_id, c.payout, txId]
    );
  }

  console.log('Seeded payouts for paid claims.');
  console.log('\nSeed complete. Default worker password: worker123');
  console.log('Admin: admin@gigshield.in / admin123');
};

seed()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    pool.end();
    process.exit(1);
  });
