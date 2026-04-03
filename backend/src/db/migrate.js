/**
 * GigShield — Database Migration Runner
 * Reads SQL files from src/db/migrations/ in filename order and runs them.
 * Tracks applied migrations in a _migrations table to prevent re-runs.
 *
 * Usage:
 *   npm run migrate          (in backend container or locally)
 *   make migrate             (via Makefile)
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL       PRIMARY KEY,
      filename   VARCHAR(300) UNIQUE NOT NULL,
      applied_at TIMESTAMP    DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename FROM _migrations ORDER BY id ASC'
  );
  return new Set(rows.map((r) => r.filename));
}

async function runMigrations() {
  const client = await pool.connect();
  let appliedCount = 0;

  try {
    await client.query('BEGIN');

    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    // Read .sql files sorted alphabetically (001_, 002_, …)
    const sqlFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of sqlFiles) {
      if (applied.has(file)) {
        console.log(`  [skip]    ${file} — already applied`);
        continue;
      }

      console.log(`  [running] ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query(sql);
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file]
      );

      console.log(`  [done]    ${file}`);
      appliedCount++;
    }

    await client.query('COMMIT');
    console.log(`\n✅ Migrations complete. Applied: ${appliedCount} new file(s).\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed — transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { runMigrations };

// ── Run directly if invoked as a script ───────────────────────
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
