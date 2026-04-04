const express = require('express');
const { pool } = require('../db/index');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @desc Get all triggers fired in the last 2 hours
 * @route GET /api/triggers/live
 */
router.get('/live', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM triggers
       WHERE triggered_at >= NOW() - INTERVAL '2 hours'
       ORDER BY triggered_at DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
