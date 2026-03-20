const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateAdmin } = require('../middleware/auth');
const { query } = require('../db/index');
const { checkAllActiveTriggers, checkZoneTriggers, createAutoClaimsForDisruption } = require('../services/triggerEngine');

// POST /api/triggers/check - manually trigger zone check (admin only)
router.post('/check', authenticateAdmin, async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (zone_id) {
      const zoneCheck = await query('SELECT id FROM zones WHERE id = $1', [zone_id]);
      if (zoneCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Zone not found.' });
      }
      const disruptions = await checkZoneTriggers(zone_id);
      return res.json({ message: 'Zone trigger check complete.', disruptions });
    } else {
      const result = await checkAllActiveTriggers();
      return res.json({ message: 'All zones trigger check complete.', result });
    }
  } catch (err) {
    console.error('POST /triggers/check error:', err);
    return res.status(500).json({ error: 'Server error during trigger check.' });
  }
});

// GET /api/triggers/active - get currently active disruptions (public/worker)
router.get('/active', async (req, res) => {
  try {
    const { zone_id } = req.query;

    let sql = `
      SELECT d.*, z.name AS zone_name, z.city, z.risk_level
      FROM disruptions d
      LEFT JOIN zones z ON d.zone_id = z.id
      WHERE d.is_active = true
    `;
    const values = [];

    if (zone_id) {
      sql += ' AND d.zone_id = $1';
      values.push(zone_id);
    }

    sql += ' ORDER BY d.started_at DESC';

    const result = await query(sql, values);
    return res.json({ disruptions: result.rows });
  } catch (err) {
    console.error('GET /triggers/active error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/triggers/admin/curfew - admin sets curfew for a zone
router.post(
  '/admin/curfew',
  authenticateAdmin,
  [
    body('zone_id').isInt({ gt: 0 }).withMessage('zone_id is required'),
    body('reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { zone_id, reason } = req.body;

    try {
      // Verify zone
      const zoneRes = await query('SELECT * FROM zones WHERE id = $1', [zone_id]);
      if (zoneRes.rowCount === 0) {
        return res.status(404).json({ error: 'Zone not found.' });
      }

      // Check for existing active curfew
      const existing = await query(
        `SELECT id FROM disruptions WHERE zone_id = $1 AND trigger_type = 'curfew' AND is_active = true`,
        [zone_id]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'An active curfew disruption already exists for this zone.' });
      }

      const disruption = await query(
        `INSERT INTO disruptions (zone_id, trigger_type, trigger_value, threshold_value, is_active)
         VALUES ($1, 'curfew', 1, 1, true) RETURNING *`,
        [zone_id]
      );

      const disruptionRecord = disruption.rows[0];

      // Auto-create claims for affected workers
      const claimsCreated = await createAutoClaimsForDisruption(disruptionRecord);

      return res.status(201).json({
        message: 'Curfew disruption created.',
        disruption: disruptionRecord,
        claims_created: claimsCreated,
      });
    } catch (err) {
      console.error('POST /triggers/admin/curfew error:', err);
      return res.status(500).json({ error: 'Server error.' });
    }
  }
);

// POST /api/triggers/admin/flood - admin sets flood alert for a zone
router.post(
  '/admin/flood',
  authenticateAdmin,
  [
    body('zone_id').isInt({ gt: 0 }).withMessage('zone_id is required'),
    body('severity').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { zone_id, severity = 1 } = req.body;

    try {
      const zoneRes = await query('SELECT * FROM zones WHERE id = $1', [zone_id]);
      if (zoneRes.rowCount === 0) {
        return res.status(404).json({ error: 'Zone not found.' });
      }

      // Check for existing active flood alert
      const existing = await query(
        `SELECT id FROM disruptions WHERE zone_id = $1 AND trigger_type = 'flood_alert' AND is_active = true`,
        [zone_id]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'An active flood disruption already exists for this zone.' });
      }

      const disruption = await query(
        `INSERT INTO disruptions (zone_id, trigger_type, trigger_value, threshold_value, is_active)
         VALUES ($1, 'flood_alert', $2, 1, true) RETURNING *`,
        [zone_id, severity]
      );

      const disruptionRecord = disruption.rows[0];
      const claimsCreated = await createAutoClaimsForDisruption(disruptionRecord);

      return res.status(201).json({
        message: 'Flood disruption created.',
        disruption: disruptionRecord,
        claims_created: claimsCreated,
      });
    } catch (err) {
      console.error('POST /triggers/admin/flood error:', err);
      return res.status(500).json({ error: 'Server error.' });
    }
  }
);

// DELETE /api/triggers/admin/disruption/:id - clear a disruption
router.delete('/admin/disruption/:id', authenticateAdmin, async (req, res) => {
  const disruptionId = parseInt(req.params.id, 10);
  if (isNaN(disruptionId)) {
    return res.status(400).json({ error: 'Invalid disruption ID.' });
  }

  try {
    const result = await query(
      `UPDATE disruptions SET is_active = false, ended_at = NOW()
       WHERE id = $1 AND is_active = true RETURNING *`,
      [disruptionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Active disruption not found.' });
    }

    return res.json({ message: 'Disruption cleared.', disruption: result.rows[0] });
  } catch (err) {
    console.error('DELETE /triggers/admin/disruption/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
