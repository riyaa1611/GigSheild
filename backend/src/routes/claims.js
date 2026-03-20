const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../db/index');

// GET /api/claims
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT c.*, z.name AS zone_name, p.week_start, p.week_end, p.coverage_amount
      FROM claims c
      LEFT JOIN zones z ON c.zone_id = z.id
      LEFT JOIN policies p ON c.policy_id = p.id
      WHERE c.worker_id = $1
    `;
    const values = [req.worker.id];
    let idx = 2;

    if (status && ['pending', 'approved', 'paid', 'flagged'].includes(status)) {
      sql += ` AND c.status = $${idx++}`;
      values.push(status);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, values);

    // Total count for pagination
    let countSql = 'SELECT COUNT(*) FROM claims WHERE worker_id = $1';
    const countValues = [req.worker.id];
    if (status && ['pending', 'approved', 'paid', 'flagged'].includes(status)) {
      countSql += ' AND status = $2';
      countValues.push(status);
    }
    const countRes = await query(countSql, countValues);

    return res.json({
      claims: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    console.error('GET /claims error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/claims/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const claimId = parseInt(req.params.id, 10);
  if (isNaN(claimId)) {
    return res.status(400).json({ error: 'Invalid claim ID.' });
  }

  try {
    const result = await query(
      `SELECT c.*, z.name AS zone_name, z.risk_level,
              p.week_start, p.week_end, p.coverage_amount, p.covered_triggers,
              pay.id AS payout_id, pay.status AS payout_status,
              pay.transaction_id, pay.completed_at AS payout_completed_at
       FROM claims c
       LEFT JOIN zones z ON c.zone_id = z.id
       LEFT JOIN policies p ON c.policy_id = p.id
       LEFT JOIN payouts pay ON pay.claim_id = c.id
       WHERE c.id = $1 AND c.worker_id = $2`,
      [claimId, req.worker.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    return res.json({ claim: result.rows[0] });
  } catch (err) {
    console.error('GET /claims/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
