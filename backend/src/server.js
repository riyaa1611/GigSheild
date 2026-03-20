require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');

const { pool } = require('./db/index');
const { runMigrations } = require('./db/migrations');
const { checkAllActiveTriggers } = require('./services/triggerEngine');

// Routes
const authRoutes    = require('./routes/auth');
const workerRoutes  = require('./routes/workers');
const policyRoutes  = require('./routes/policies');
const claimRoutes   = require('./routes/claims');
const triggerRoutes = require('./routes/triggers');
const adminRoutes   = require('./routes/admin');
const payoutRoutes  = require('./routes/payouts');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'GigShield API', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use('/api/auth',     authRoutes);
app.use('/api/workers',  workerRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims',   claimRoutes);
app.use('/api/triggers', triggerRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/payouts',  payoutRoutes);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---- Global error handler ----
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message || 'Internal server error';
  res.status(statusCode).json({ error: message });
});

// ---- Cron: Check all triggers every hour ----
const startCronJobs = () => {
  // Run at the top of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly trigger check...');
    try {
      await checkAllActiveTriggers();
    } catch (err) {
      console.error('[Cron] Trigger check error:', err);
    }
  });

  console.log('[Cron] Hourly trigger check scheduled.');
};

// ---- Start server ----
const startServer = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('[DB] PostgreSQL connected.');

    // Run migrations on startup
    await runMigrations();

    // Start Express
    app.listen(PORT, () => {
      console.log(`[Server] GigShield API running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start cron jobs
    startCronJobs();
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  await pool.end();
  console.log('[DB] Connection pool closed.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

startServer();

module.exports = app; // for testing
