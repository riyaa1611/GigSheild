const { query } = require('../db/index');

/**
 * Check if a duplicate claim exists for the same worker, zone, trigger type, and date.
 * @returns {{ isDuplicate: boolean, reason: string|null }}
 */
const checkDuplicateClaim = async (workerId, zoneId, triggerType, disruptionDate) => {
  try {
    const result = await query(
      `SELECT id FROM claims
       WHERE worker_id = $1
         AND zone_id = $2
         AND trigger_type = $3
         AND disruption_date = $4
         AND status != 'flagged'`,
      [workerId, zoneId, triggerType, disruptionDate]
    );

    if (result.rowCount > 0) {
      return {
        isDuplicate: true,
        reason: `Duplicate claim: worker ${workerId} already has a ${triggerType} claim for zone ${zoneId} on ${disruptionDate}.`,
      };
    }

    return { isDuplicate: false, reason: null };
  } catch (err) {
    console.error('[FraudDetection] checkDuplicateClaim error:', err);
    return { isDuplicate: false, reason: null }; // Fail open to avoid blocking legitimate claims
  }
};

/**
 * Validate that the worker's registered zone matches the disruption zone.
 * @returns {{ isValid: boolean, reason: string|null }}
 */
const validateZoneMatch = async (workerId, disruptionZoneId) => {
  try {
    const workerRes = await query(
      'SELECT zone_id FROM workers WHERE id = $1',
      [workerId]
    );

    if (workerRes.rowCount === 0) {
      return { isValid: false, reason: 'Worker not found.' };
    }

    const worker = workerRes.rows[0];

    if (parseInt(worker.zone_id, 10) !== parseInt(disruptionZoneId, 10)) {
      return {
        isValid: false,
        reason: `Zone mismatch: worker registered in zone ${worker.zone_id} but disruption is in zone ${disruptionZoneId}.`,
      };
    }

    return { isValid: true, reason: null };
  } catch (err) {
    console.error('[FraudDetection] validateZoneMatch error:', err);
    return { isValid: true, reason: null }; // Fail open
  }
};

/**
 * Check if the worker's declared income is an anomaly vs the zone average.
 * Flags if declared income is >2.5x the zone average (outlier).
 * @returns {{ isAnomaly: boolean, reason: string|null, zone_avg: number|null }}
 */
const checkIncomeAnomaly = async (workerId, declaredIncome) => {
  try {
    // Get worker's zone
    const workerRes = await query(
      'SELECT zone_id FROM workers WHERE id = $1',
      [workerId]
    );

    if (workerRes.rowCount === 0) {
      return { isAnomaly: false, reason: null, zone_avg: null };
    }

    const { zone_id } = workerRes.rows[0];

    // Get average income in the zone (excluding the current worker)
    const avgRes = await query(
      `SELECT AVG(weekly_income) AS avg_income, COUNT(*) AS worker_count
       FROM workers WHERE zone_id = $1 AND id != $2`,
      [zone_id, workerId]
    );

    const avgIncome = parseFloat(avgRes.rows[0].avg_income) || 0;
    const workerCount = parseInt(avgRes.rows[0].worker_count, 10);

    if (workerCount < 2) {
      // Not enough data to compare
      return { isAnomaly: false, reason: null, zone_avg: avgIncome };
    }

    const ratio = declaredIncome / avgIncome;

    if (ratio > 2.5) {
      return {
        isAnomaly: true,
        reason: `Income anomaly: declared ₹${declaredIncome}/week is ${ratio.toFixed(1)}x the zone average (₹${avgIncome.toFixed(0)}).`,
        zone_avg: parseFloat(avgIncome.toFixed(2)),
      };
    }

    return { isAnomaly: false, reason: null, zone_avg: parseFloat(avgIncome.toFixed(2)) };
  } catch (err) {
    console.error('[FraudDetection] checkIncomeAnomaly error:', err);
    return { isAnomaly: false, reason: null, zone_avg: null };
  }
};

/**
 * Check if a worker has filed too many claims in the last 7 days.
 * Flags if >3 claims in 7 days.
 * @returns {{ isFlagged: boolean, reason: string|null, claim_count: number }}
 */
const checkClaimVelocity = async (workerId) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await query(
      `SELECT COUNT(*) AS claim_count FROM claims
       WHERE worker_id = $1
         AND created_at >= $2
         AND status != 'flagged'`,
      [workerId, sevenDaysAgo.toISOString()]
    );

    const claimCount = parseInt(result.rows[0].claim_count, 10);

    if (claimCount >= 3) {
      return {
        isFlagged: true,
        reason: `High claim velocity: ${claimCount} claims in the last 7 days (threshold: 3).`,
        claim_count: claimCount,
      };
    }

    return { isFlagged: false, reason: null, claim_count: claimCount };
  } catch (err) {
    console.error('[FraudDetection] checkClaimVelocity error:', err);
    return { isFlagged: false, reason: null, claim_count: 0 };
  }
};

module.exports = {
  checkDuplicateClaim,
  validateZoneMatch,
  checkIncomeAnomaly,
  checkClaimVelocity,
};
