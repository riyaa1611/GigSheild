const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateAdmin } = require('../middleware/auth');
const { query } = require('../db/index');

// GET /api/admin/dashboard
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Weekly window
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Active policies
    const activePoliciesRes = await query(
      `SELECT COUNT(*) FROM policies WHERE status = 'active'`
    );

    // Total workers
    const totalWorkersRes = await query(`SELECT COUNT(*) FROM workers`);

    // Payouts this week
    const payoutsWeekRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payouts WHERE created_at >= $1 AND created_at <= $2`,
      [monday.toISOString(), sunday.toISOString()]
    );

    // Premiums this week (sum of active policy premiums)
    const premiumsWeekRes = await query(
      `SELECT COALESCE(SUM(weekly_premium), 0) AS total FROM policies
       WHERE status = 'active' AND week_start = $1`,
      [monday.toISOString().split('T')[0]]
    );

    // Claims this week
    const claimsWeekRes = await query(
      `SELECT COUNT(*) FROM claims WHERE created_at >= $1 AND created_at <= $2`,
      [monday.toISOString(), sunday.toISOString()]
    );

    // Flagged claims (all time)
    const flaggedRes = await query(
      `SELECT COUNT(*) FROM claims WHERE fraud_flag = true AND status != 'paid'`
    );

    // Loss ratio = payouts / premiums
    const totalPayouts = parseFloat(payoutsWeekRes.rows[0].total);
    const totalPremiums = parseFloat(premiumsWeekRes.rows[0].total);
    const lossRatio = totalPremiums > 0 ? parseFloat((totalPayouts / totalPremiums).toFixed(4)) : 0;

    // Zones summary
    const zonesRes = await query(
      `SELECT z.id, z.name, z.risk_level, z.city, z.flood_prone,
              COUNT(DISTINCT w.id) AS worker_count,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policies,
              COUNT(DISTINCT d.id) FILTER (WHERE d.is_active = true) AS active_disruptions
       FROM zones z
       LEFT JOIN workers w ON w.zone_id = z.id
       LEFT JOIN policies p ON p.zone_id = z.id
       LEFT JOIN disruptions d ON d.zone_id = z.id
       GROUP BY z.id
       ORDER BY z.risk_level DESC`
    );

    return res.json({
      total_active_policies: parseInt(activePoliciesRes.rows[0].count, 10),
      total_workers: parseInt(totalWorkersRes.rows[0].count, 10),
      total_payouts_week: totalPayouts,
      total_premiums_week: totalPremiums,
      loss_ratio: lossRatio,
      claims_this_week: parseInt(claimsWeekRes.rows[0].count, 10),
      flagged_claims: parseInt(flaggedRes.rows[0].count, 10),
      zones: zonesRes.rows,
    });
  } catch (err) {
    console.error('GET /admin/dashboard error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/claims
router.get('/claims', authenticateAdmin, async (req, res) => {
  try {
    const { status, zone_id, fraud_flag, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT c.*, w.name AS worker_name, w.phone AS worker_phone,
             z.name AS zone_name, z.risk_level,
             p.week_start, p.week_end, p.coverage_amount
      FROM claims c
      LEFT JOIN workers w ON c.worker_id = w.id
      LEFT JOIN zones z ON c.zone_id = z.id
      LEFT JOIN policies p ON c.policy_id = p.id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;

    if (status && ['pending', 'approved', 'paid', 'flagged'].includes(status)) {
      sql += ` AND c.status = $${idx++}`;
      values.push(status);
    }
    if (zone_id) {
      sql += ` AND c.zone_id = $${idx++}`;
      values.push(zone_id);
    }
    if (fraud_flag !== undefined) {
      sql += ` AND c.fraud_flag = $${idx++}`;
      values.push(fraud_flag === 'true');
    }

    sql += ` ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, values);

    // Count
    let countSql = 'SELECT COUNT(*) FROM claims WHERE 1=1';
    const countValues = [];
    let ci = 1;
    if (status) { countSql += ` AND status = $${ci++}`; countValues.push(status); }
    if (zone_id) { countSql += ` AND zone_id = $${ci++}`; countValues.push(zone_id); }
    if (fraud_flag !== undefined) { countSql += ` AND fraud_flag = $${ci++}`; countValues.push(fraud_flag === 'true'); }

    const countRes = await query(countSql, countValues);

    return res.json({
      claims: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('GET /admin/claims error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/admin/claims/:id/override
router.put(
  '/claims/:id/override',
  authenticateAdmin,
  [
    body('status')
      .isIn(['pending', 'approved', 'paid', 'flagged'])
      .withMessage('Invalid status value'),
    body('fraud_flag').optional().isBoolean(),
    body('fraud_reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claimId = parseInt(req.params.id, 10);
    if (isNaN(claimId)) {
      return res.status(400).json({ error: 'Invalid claim ID.' });
    }

    const { status, fraud_flag, fraud_reason } = req.body;

    try {
      const updates = [`status = $1`];
      const values = [status];
      let idx = 2;

      if (fraud_flag !== undefined) {
        updates.push(`fraud_flag = $${idx++}`);
        values.push(fraud_flag);
      }
      if (fraud_reason !== undefined) {
        updates.push(`fraud_reason = $${idx++}`);
        values.push(fraud_reason);
      }
      if (status === 'paid') {
        updates.push(`paid_at = $${idx++}`);
        values.push(new Date().toISOString());
      }

      values.push(claimId);
      const result = await query(
        `UPDATE claims SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      return res.json({ message: 'Claim updated.', claim: result.rows[0] });
    } catch (err) {
      console.error('PUT /admin/claims/:id/override error:', err);
      return res.status(500).json({ error: 'Server error.' });
    }
  }
);

// GET /api/admin/workers
router.get('/workers', authenticateAdmin, async (req, res) => {
  try {
    const { zone_id, platform, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT w.id, w.name, w.phone, w.email, w.city, w.zone_id, w.platform,
             w.weekly_income, w.is_verified, w.upi_id, w.created_at,
             z.name AS zone_name, z.risk_level,
             COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policies,
             COUNT(DISTINCT c.id) AS total_claims
      FROM workers w
      LEFT JOIN zones z ON w.zone_id = z.id
      LEFT JOIN policies p ON p.worker_id = w.id
      LEFT JOIN claims c ON c.worker_id = w.id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;

    if (zone_id) {
      sql += ` AND w.zone_id = $${idx++}`;
      values.push(zone_id);
    }
    if (platform && ['zomato', 'swiggy', 'both'].includes(platform)) {
      sql += ` AND w.platform = $${idx++}`;
      values.push(platform);
    }

    sql += ` GROUP BY w.id, z.name, z.risk_level`;
    sql += ` ORDER BY w.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, values);

    const countRes = await query('SELECT COUNT(*) FROM workers');

    return res.json({
      workers: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('GET /admin/workers error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/zones
router.get('/zones', authenticateAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT z.*,
              COUNT(DISTINCT w.id) AS worker_count,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policies,
              COUNT(DISTINCT d.id) FILTER (WHERE d.is_active = true) AS active_disruptions,
              COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'completed'), 0) AS total_paid_out,
              COUNT(DISTINCT c.id) AS total_claims
       FROM zones z
       LEFT JOIN workers w ON w.zone_id = z.id
       LEFT JOIN policies p ON p.zone_id = z.id
       LEFT JOIN claims c ON c.zone_id = z.id
       LEFT JOIN payouts pay ON pay.claim_id = c.id
       LEFT JOIN disruptions d ON d.zone_id = z.id
       GROUP BY z.id
       ORDER BY z.risk_level DESC`
    );

    return res.json({ zones: result.rows });
  } catch (err) {
    console.error('GET /admin/zones error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
