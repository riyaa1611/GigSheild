const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { query } = require('../db/index');
const { initiatePayout } = require('../services/payoutService');

// GET /api/payouts - worker's payouts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT pay.*, c.trigger_type, c.disruption_date, c.hours_lost,
              z.name AS zone_name
       FROM payouts pay
       LEFT JOIN claims c ON pay.claim_id = c.id
       LEFT JOIN zones z ON c.zone_id = z.id
       WHERE pay.worker_id = $1
       ORDER BY pay.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.worker.id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const countRes = await query(
      'SELECT COUNT(*) FROM payouts WHERE worker_id = $1',
      [req.worker.id]
    );

    return res.json({
      payouts: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('GET /payouts error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/payouts/:claimId/initiate - initiate payout for approved claim
// Can be called by admin (no worker auth needed here, admin or internal use)
router.post('/:claimId/initiate', authenticateAdmin, async (req, res) => {
  const claimId = parseInt(req.params.claimId, 10);
  if (isNaN(claimId)) {
    return res.status(400).json({ error: 'Invalid claim ID.' });
  }

  try {
    // Verify claim exists and is approved
    const claimRes = await query(
      `SELECT * FROM claims WHERE id = $1`,
      [claimId]
    );

    if (claimRes.rowCount === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const claim = claimRes.rows[0];

    if (claim.status !== 'approved') {
      return res.status(400).json({ error: `Claim must be in 'approved' status to initiate payout. Current: ${claim.status}` });
    }

    // Check if payout already exists
    const existingPayout = await query(
      'SELECT id FROM payouts WHERE claim_id = $1',
      [claimId]
    );
    if (existingPayout.rowCount > 0) {
      return res.status(409).json({ error: 'Payout already initiated for this claim.' });
    }

    const payout = await initiatePayout(claimId);

    return res.status(201).json({ message: 'Payout initiated.', payout });
  } catch (err) {
    console.error('POST /payouts/:claimId/initiate error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
