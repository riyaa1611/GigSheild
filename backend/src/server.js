require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');

const { pool } = require('./db/index');
const { runMigrations } = require('./db/migrate');
const socketModule = require('./socket');
const { initCron } = require('./jobs/triggerCron');
const { initAutoPayCron } = require('./jobs/autoPayCron');
const { initAnalyticsCron } = require('./jobs/analyticsSnapshotCron');
const { startClaimsProcessor } = require('./services/claimsService');
const { startPayoutProcessor } = require('./services/payoutService');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes    = require('./routes/auth');
const workerRoutes  = require('./routes/workers');
const policyRoutes  = require('./routes/policies');
const claimRoutes   = require('./routes/claims');
const triggerRoutes = require('./routes/triggers');
const adminRoutes   = require('./routes/admin');
const payoutRoutes  = require('./routes/payouts');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.io
socketModule.init(server);

const PORT = process.env.PORT || 3001;

// ---- Middleware ----
app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(globalLimiter);
app.use(requestLogger);

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
app.use('/api/analytics', analyticsRoutes);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---- Global error handler ----
app.use(errorHandler);

// ---- Cron: Start automated processes ----
const startCronJobs = () => {
  initCron();
  initAutoPayCron();
  initAnalyticsCron();
};

// ---- Start server ----
const startServer = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('[DB] PostgreSQL connected.');

    // Run migrations on startup
    await runMigrations();

    // Start Queue Processors
    startClaimsProcessor();
    startPayoutProcessor();

    // Start Server
    server.listen(PORT, () => {
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

server.on('error', (err) => console.error('[Server Error]', err));

module.exports = server; // for testing
