/**
 * GigShield — Development Seed Runner
 * Executes seeds/dev_seed.sql via psql or pg driver.
 *
 * Usage:
 *   npm run seed     (in backend container or locally)
 *   make seed        (via Makefile)
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSeed() {
  const client = await pool.connect();

  try {
    const seedFile = path.join(__dirname, 'seeds', 'dev_seed.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');

    console.log('🌱 Running dev seed…');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Dev seed applied successfully.\n');

    // Quick verification
    const { rows } = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM users)    AS users,
         (SELECT COUNT(*) FROM policies) AS policies,
         (SELECT COUNT(*) FROM triggers) AS triggers,
         (SELECT COUNT(*) FROM claims)   AS claims,
         (SELECT COUNT(*) FROM payouts)  AS payouts`
    );
    console.table(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed — rolled back:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
