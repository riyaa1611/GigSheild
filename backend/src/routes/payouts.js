const express = require('express');
const { pool } = require('../db/index');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @desc Get worker's payouts history
 * @route GET /api/payouts/history
 */
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const { rows } = await pool.query(`
    SELECT p.amount, p.status, p.paid_at, t.type as trigger_type,
           EXTRACT(EPOCH FROM (p.paid_at - c.created_at))/60 AS payout_time_minutes
    FROM payouts p
    JOIN claims c ON c.id = p.claim_id
    JOIN triggers t ON t.id = c.trigger_id
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC
  `, [userId]);

  res.json({ success: true, count: rows.length, data: rows });
}));

/**
 * @desc Admin: Payout analytics snapshot
 * @route GET /api/payouts/admin/analytics
 */
router.get('/admin/analytics', requireAdmin, asyncHandler(async (req, res) => {
  // Aggregate overall logic
  const analyticsRes = await pool.query(`
    SELECT 
      SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END) as total_paid_out,
      COUNT(CASE WHEN p.status = 'success' THEN 1 END) as success_count,
      COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
      COUNT(*) as total_count,
      SUM(p.attempt_count) as retries_count,
      AVG(EXTRACT(EPOCH FROM (p.paid_at - c.created_at))/60) as avg_payout_time_minutes
    FROM payouts p
    JOIN claims c ON c.id = p.claim_id
  `);

  const stats = analyticsRes.rows[0];
  const totalCount = parseInt(stats.total_count) || 1; // prevent div by zero
  const successRate = (parseInt(stats.success_count) / totalCount) * 100;

  // Breakdown by trigger type
  const typeRes = await pool.query(`
    SELECT t.type, COUNT(*) as count, SUM(p.amount) as total
    FROM payouts p
    JOIN claims c ON p.claim_id = c.id
    JOIN triggers t ON t.id = c.trigger_id
    WHERE p.status = 'success'
    GROUP BY t.type
  `);

  res.json({
    success: true,
    data: {
      totalPaidOut: stats.total_paid_out || 0,
      avgPayoutTimeMinutes: stats.avg_payout_time_minutes || 0,
      successRate: successRate.toFixed(2) + '%',
      failedCount: stats.failed_count || 0,
      retriesCount: stats.retries_count || 0,
      payoutsByTriggerType: typeRes.rows
    }
  });
}));

module.exports = router;
