const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../db/index');
const { getWeatherForZone, getAQIForZone } = require('../services/weatherService');

// GET /api/workers/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT w.id, w.name, w.phone, w.email, w.city, w.zone_id, w.platform,
              w.weekly_income, w.aadhaar_mock, w.is_verified, w.upi_id,
              w.bank_account_mock, w.created_at,
              z.name AS zone_name, z.risk_level, z.flood_prone, z.monsoon_multiplier
       FROM workers w
       LEFT JOIN zones z ON w.zone_id = z.id
       WHERE w.id = $1`,
      [req.worker.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    return res.json({ worker: result.rows[0] });
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/workers/me
router.put(
  '/me',
  authenticateToken,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim().isMobilePhone(),
    body('platform').optional().isIn(['zomato', 'swiggy', 'both']),
    body('weekly_income').optional().isFloat({ gt: 0 }),
    body('upi_id').optional().trim(),
    body('bank_account_mock').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, platform, weekly_income, upi_id, bank_account_mock } = req.body;
    const workerId = req.worker.id;

    try {
      // Build dynamic update
      const updates = [];
      const values = [];
      let idx = 1;

      if (name !== undefined)              { updates.push(`name = $${idx++}`);              values.push(name); }
      if (phone !== undefined)             { updates.push(`phone = $${idx++}`);             values.push(phone); }
      if (platform !== undefined)          { updates.push(`platform = $${idx++}`);          values.push(platform); }
      if (weekly_income !== undefined)     { updates.push(`weekly_income = $${idx++}`);     values.push(weekly_income); }
      if (upi_id !== undefined)            { updates.push(`upi_id = $${idx++}`);            values.push(upi_id); }
      if (bank_account_mock !== undefined) { updates.push(`bank_account_mock = $${idx++}`); values.push(bank_account_mock); }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
      }

      values.push(workerId);
      const result = await query(
        `UPDATE workers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, phone, email, city, zone_id, platform, weekly_income, upi_id, bank_account_mock`,
        values
      );

      return res.json({ message: 'Profile updated.', worker: result.rows[0] });
    } catch (err) {
      console.error('PUT /me error:', err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Phone number already in use.' });
      }
      return res.status(500).json({ error: 'Server error.' });
    }
  }
);

// GET /api/workers/me/dashboard
router.get('/me/dashboard', authenticateToken, async (req, res) => {
  try {
    const workerId = req.worker.id;

    // Worker info
    const workerRes = await query(
      `SELECT w.id, w.name, w.email, w.phone, w.city, w.zone_id, w.platform,
              w.weekly_income, w.is_verified, w.upi_id,
              z.name AS zone_name, z.risk_level, z.flood_prone, z.monsoon_multiplier, z.lat, z.lon
       FROM workers w
       LEFT JOIN zones z ON w.zone_id = z.id
       WHERE w.id = $1`,
      [workerId]
    );

    if (workerRes.rowCount === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    const worker = workerRes.rows[0];

    // Active policy
    const policyRes = await query(
      `SELECT * FROM policies WHERE worker_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [workerId]
    );
    const activePolicy = policyRes.rows[0] || null;

    // Recent claims (last 10)
    const claimsRes = await query(
      `SELECT c.*, z.name AS zone_name FROM claims c
       LEFT JOIN zones z ON c.zone_id = z.id
       WHERE c.worker_id = $1
       ORDER BY c.created_at DESC LIMIT 10`,
      [workerId]
    );

    // Active disruptions in worker's zone
    const alertsRes = await query(
      `SELECT d.*, z.name AS zone_name FROM disruptions d
       LEFT JOIN zones z ON d.zone_id = z.id
       WHERE d.zone_id = $1 AND d.is_active = true
       ORDER BY d.started_at DESC`,
      [worker.zone_id]
    );

    // Weather data
    let weather = null;
    let aqi = null;
    if (worker.zone_id) {
      try {
        weather = await getWeatherForZone(worker);
        aqi = await getAQIForZone(worker);
      } catch (weatherErr) {
        console.error('Weather fetch error (non-fatal):', weatherErr.message);
      }
    }

    // Stats: earnings protected this month
    const statsRes = await query(
      `SELECT COALESCE(SUM(payout_amount), 0) AS total_paid_out,
              COUNT(*) FILTER (WHERE status = 'paid') AS paid_claims,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved_claims,
              COUNT(*) FILTER (WHERE status = 'pending') AS pending_claims
       FROM claims WHERE worker_id = $1`,
      [workerId]
    );

    return res.json({
      worker,
      active_policy: activePolicy,
      recent_claims: claimsRes.rows,
      active_alerts: alertsRes.rows,
      weather,
      aqi,
      stats: statsRes.rows[0],
    });
  } catch (err) {
    console.error('GET /me/dashboard error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
