const express = require('express');
const { pool } = require('../db/index');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const twilio = require('twilio');
const { payoutsQueue } = require('../services/claimsService');

const router = express.Router();

// Helper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @desc Get worker's own claims
 * @route GET /api/claims
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { status, limit = 10, offset = 0 } = req.query;
  const userId = req.user.userId;

  let queryStr = `SELECT * FROM claims WHERE user_id = $1`;
  const params = [userId];

  if (status) {
    params.push(status);
    queryStr += ` AND status = $2`;
  }

  queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(queryStr, params);
  res.json({ success: true, count: rows.length, claims: rows });
}));

/**
 * @desc Admin: Get all claims
 * @route GET /api/claims/admin/all
 */
router.get('/admin/all', requireAdmin, asyncHandler(async (req, res) => {
  const { status, zone, triggerId, limit = 50, offset = 0 } = req.query;

  let queryStr = `
    SELECT c.*, u.phone, u.pincode 
    FROM claims c
    JOIN users u ON u.id = c.user_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    queryStr += ` AND c.status = $${params.length}`;
  }
  if (zone) {
    params.push(zone);
    queryStr += ` AND u.pincode = $${params.length}`;
  }
  if (triggerId) {
    params.push(triggerId);
    queryStr += ` AND c.trigger_id = $${params.length}`;
  }

  queryStr += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(queryStr, params);
  res.json({ success: true, count: rows.length, claims: rows });
}));

/**
 * @desc Admin: Get flagged manual_review claims
 * @route GET /api/claims/admin/flagged
 */
router.get('/admin/flagged', requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.phone, u.pincode, u.device_fingerprint, u.last_gps_ping_at 
    FROM claims c
    JOIN users u ON u.id = c.user_id
    WHERE c.status = 'manual_review'
    ORDER BY c.created_at ASC
  `);
  
  res.json({ success: true, count: rows.length, claims: rows });
}));

/**
 * @desc Admin: Review a flagged claim
 * @route PATCH /api/claims/admin/:id/review
 */
router.patch('/admin/:id/review', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, adminNote } = req.body;
  const adminId = req.user.userId;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: true, message: 'Invalid action. Use approve/reject' });
  }

  const { rows } = await pool.query(`SELECT status, payout_amount, user_id FROM claims WHERE id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: true, message: 'Claim not found' });
  
  const claim = rows[0];
  if (claim.status !== 'manual_review' && claim.status !== 'flagged_secondary') {
    return res.status(400).json({ error: true, message: 'Claim is not explicitly in manual_review queue' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  
  await pool.query(`
    UPDATE claims 
    SET status = $1, reviewed_by = $2, review_note = $3, reviewed_at = NOW() 
    WHERE id = $4
  `, [newStatus, adminId, adminNote, id]);

  if (newStatus === 'approved') {
    await payoutsQueue.add({ claimId: id, payoutAmount: claim.payout_amount });
  } else {
    // Rejected context - dispatch SMS conceptually
    const userRes = await pool.query(`SELECT phone FROM users WHERE id = $1`, [claim.user_id]);
    if (userRes.rows.length) {
      console.log(`[AdminReview] Dispatching rejection SMS to ${userRes.rows[0].phone}`);
      // twilio integration logic mock
    }
  }

  res.json({ success: true, claimId: id, newStatus });
}));

module.exports = router;
