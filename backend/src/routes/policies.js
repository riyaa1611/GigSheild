const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../db/index');

const ALL_TRIGGERS = ['heavy_rain', 'extreme_heat', 'severe_aqi', 'flood_alert', 'curfew'];

// Calculate current week's Monday and Sunday
const getWeekBounds = () => {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
};

const formatDate = (d) => d.toISOString().split('T')[0];

// GET /api/policies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, z.name AS zone_name, z.risk_level
       FROM policies p
       LEFT JOIN zones z ON p.zone_id = z.id
       WHERE p.worker_id = $1
       ORDER BY p.created_at DESC`,
      [req.worker.id]
    );
    return res.json({ policies: result.rows });
  } catch (err) {
    console.error('GET /policies error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/policies/preview - preview premium for current worker without creating policy
router.get('/preview', authenticateToken, async (req, res) => {
  try {
    const workerRes = await query(
      `SELECT w.id, w.zone_id, w.weekly_income, w.platform,
              z.name AS zone_name, z.risk_level, z.monsoon_multiplier
       FROM workers w LEFT JOIN zones z ON w.zone_id = z.id
       WHERE w.id = $1`,
      [req.worker.id]
    );
    if (workerRes.rowCount === 0) return res.status(404).json({ error: 'Worker not found.' });
    const worker = workerRes.rows[0];

    const riskPremiumMap = { low: 0.015, medium: 0.02, high: 0.025, extreme: 0.035 };
    const premiumRate = riskPremiumMap[worker.risk_level] || 0.02;
    const month = new Date().getMonth() + 1;
    const isMonsoon = month >= 6 && month <= 10;
    const seasonal = isMonsoon ? (worker.monsoon_multiplier || 1.3) : 1.0;
    const rawPremium = worker.weekly_income * premiumRate * seasonal;
    const weekly_premium = Math.min(80, Math.max(25, Math.round(rawPremium)));
    const coverage_amount = parseFloat((worker.weekly_income * 2.5).toFixed(2));

    return res.json({
      weekly_premium_inr: weekly_premium,
      coverage_amount_inr: coverage_amount,
      zone_name: worker.zone_name,
      risk_level: worker.risk_level,
      is_monsoon_season: isMonsoon,
      covered_triggers: ALL_TRIGGERS,
    });
  } catch (err) {
    console.error('GET /policies/preview error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/policies - create/activate a new weekly policy
router.post(
  '/',
  authenticateToken,
  [
    body('covered_triggers')
      .optional()
      .isArray()
      .withMessage('covered_triggers must be an array'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workerId = req.worker.id;

    try {
      // Get worker zone and income
      const workerRes = await query(
        'SELECT id, zone_id, weekly_income FROM workers WHERE id = $1',
        [workerId]
      );
      if (workerRes.rowCount === 0) {
        return res.status(404).json({ error: 'Worker not found.' });
      }
      const worker = workerRes.rows[0];

      const { monday, sunday } = getWeekBounds();
      const weekStart = formatDate(monday);
      const weekEnd = formatDate(sunday);

      // Check for existing active policy this week
      const existing = await query(
        `SELECT id FROM policies
         WHERE worker_id = $1 AND status = 'active' AND week_start = $2`,
        [workerId, weekStart]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'An active policy already exists for this week.' });
      }

      // Validate and filter triggers
      let coveredTriggers = req.body.covered_triggers;
      if (!coveredTriggers || coveredTriggers.length === 0) {
        coveredTriggers = ALL_TRIGGERS;
      } else {
        coveredTriggers = coveredTriggers.filter((t) => ALL_TRIGGERS.includes(t));
        if (coveredTriggers.length === 0) {
          return res.status(400).json({ error: 'No valid triggers provided.' });
        }
      }

      // Get zone for multiplier
      const zoneRes = await query(
        'SELECT id, monsoon_multiplier, risk_level FROM zones WHERE id = $1',
        [worker.zone_id]
      );
      const zone = zoneRes.rows[0];
      const riskPremiumMap = { low: 0.015, medium: 0.02, high: 0.025, extreme: 0.035 };
      const premiumRate = riskPremiumMap[zone.risk_level] || 0.02;

      const weekly_premium = parseFloat((worker.weekly_income * premiumRate).toFixed(2));
      const coverage_amount = parseFloat((worker.weekly_income * 2.5).toFixed(2));

      const result = await query(
        `INSERT INTO policies (worker_id, zone_id, status, week_start, week_end,
          weekly_premium, coverage_amount, covered_triggers)
         VALUES ($1,$2,'active',$3,$4,$5,$6,$7)
         RETURNING *, (SELECT name FROM zones WHERE id = $2) AS zone_name`,
        [workerId, worker.zone_id, weekStart, weekEnd, weekly_premium, coverage_amount, coveredTriggers]
      );

      return res.status(201).json({ message: 'Policy activated.', policy: result.rows[0] });
    } catch (err) {
      console.error('POST /policies error:', err);
      return res.status(500).json({ error: 'Server error.' });
    }
  }
);

// PUT /api/policies/:id/deactivate
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  const policyId = parseInt(req.params.id, 10);
  if (isNaN(policyId)) {
    return res.status(400).json({ error: 'Invalid policy ID.' });
  }

  try {
    const result = await query(
      `UPDATE policies SET status = 'inactive'
       WHERE id = $1 AND worker_id = $2 AND status = 'active'
       RETURNING *`,
      [policyId, req.worker.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Active policy not found or not owned by you.' });
    }

    return res.json({ message: 'Policy deactivated.', policy: result.rows[0] });
  } catch (err) {
    console.error('PUT /policies/:id/deactivate error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/policies/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const policyId = parseInt(req.params.id, 10);
  if (isNaN(policyId)) {
    return res.status(400).json({ error: 'Invalid policy ID.' });
  }

  try {
    const result = await query(
      `SELECT p.*, z.name AS zone_name, z.risk_level, z.flood_prone, z.monsoon_multiplier
       FROM policies p
       LEFT JOIN zones z ON p.zone_id = z.id
       WHERE p.id = $1 AND p.worker_id = $2`,
      [policyId, req.worker.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Policy not found.' });
    }

    return res.json({ policy: result.rows[0] });
  } catch (err) {
    console.error('GET /policies/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
