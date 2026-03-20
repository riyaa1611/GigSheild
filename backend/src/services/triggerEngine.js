const { query } = require('../db/index');
const { getWeatherForZone, getAQIForZone } = require('./weatherService');
const { checkDuplicateClaim, validateZoneMatch, checkClaimVelocity } = require('./fraudDetection');

// Parametric thresholds
const THRESHOLDS = {
  heavy_rain:   { value: 50,  unit: 'mm/day',  description: 'Heavy rainfall > 50mm/day' },
  extreme_heat: { value: 42,  unit: '°C',      description: 'Extreme heat > 42°C' },
  severe_aqi:   { value: 300, unit: 'AQI',     description: 'Severe AQI > 300' },
};

/**
 * Estimate hours lost based on trigger type and severity.
 */
const estimateHoursLost = (triggerType, triggerValue) => {
  switch (triggerType) {
    case 'heavy_rain': {
      // 50-70mm: 4hrs, 70-100mm: 6hrs, >100mm: 8hrs
      if (triggerValue >= 100) return 8.0;
      if (triggerValue >= 70)  return 6.0;
      if (triggerValue >= 50)  return 4.0;
      return 2.0;
    }
    case 'extreme_heat': {
      // 42-44°C: 3hrs, 44-46°C: 5hrs, >46°C: 7hrs
      if (triggerValue >= 46) return 7.0;
      if (triggerValue >= 44) return 5.0;
      if (triggerValue >= 42) return 3.0;
      return 1.0;
    }
    case 'severe_aqi': {
      // 300-400: 4hrs, 400-500: 6hrs, >500: 8hrs
      if (triggerValue >= 500) return 8.0;
      if (triggerValue >= 400) return 6.0;
      if (triggerValue >= 300) return 4.0;
      return 2.0;
    }
    case 'flood_alert': {
      // Severity 1-2: 8hrs (full day), 3+: 8hrs
      return 8.0;
    }
    case 'curfew': {
      // Curfews typically last most of the day
      return 8.0;
    }
    default:
      return 4.0;
  }
};

/**
 * Calculate payout for a worker given disruption info.
 * Formula: (weekly_income / 7) * (hours_lost / 8)
 */
const calculatePayout = (worker, disruption) => {
  const hoursLost = estimateHoursLost(disruption.trigger_type, disruption.trigger_value);
  const dailyIncome = worker.weekly_income / 7;
  const payout = dailyIncome * (hoursLost / 8);
  return {
    payout_amount: parseFloat(payout.toFixed(2)),
    hours_lost: hoursLost,
  };
};

/**
 * Create auto-claims for all workers in a zone with active policies covering the trigger.
 */
const createAutoClaimsForDisruption = async (disruption) => {
  const { id: disruptionId, zone_id, trigger_type, trigger_value } = disruption;
  const today = new Date().toISOString().split('T')[0];
  const createdClaims = [];

  try {
    // Get all workers in zone with active policies covering this trigger
    const workersRes = await query(
      `SELECT w.id AS worker_id, w.weekly_income, w.zone_id,
              p.id AS policy_id, p.covered_triggers, p.coverage_amount
       FROM workers w
       JOIN policies p ON p.worker_id = w.id
       WHERE w.zone_id = $1
         AND p.status = 'active'
         AND $2 = ANY(p.covered_triggers)`,
      [zone_id, trigger_type]
    );

    for (const row of workersRes.rows) {
      // Fraud checks
      const dupCheck = await checkDuplicateClaim(row.worker_id, zone_id, trigger_type, today);
      if (dupCheck.isDuplicate) {
        console.log(`[TriggerEngine] Skipping duplicate claim for worker ${row.worker_id}: ${dupCheck.reason}`);
        // Create flagged claim instead
        await query(
          `INSERT INTO claims (worker_id, policy_id, trigger_type, disruption_date, zone_id,
            hours_lost, payout_amount, status, auto_generated, fraud_flag, fraud_reason)
           VALUES ($1,$2,$3,$4,$5,0,0,'flagged',true,true,$6)`,
          [row.worker_id, row.policy_id, trigger_type, today, zone_id, dupCheck.reason]
        );
        continue;
      }

      const velocityCheck = await checkClaimVelocity(row.worker_id);
      if (velocityCheck.isFlagged) {
        console.log(`[TriggerEngine] Claim velocity flag for worker ${row.worker_id}: ${velocityCheck.reason}`);
      }

      const { payout_amount, hours_lost } = calculatePayout(row, disruption);

      // Cap payout at coverage_amount
      const finalPayout = Math.min(payout_amount, parseFloat(row.coverage_amount));

      const claimRes = await query(
        `INSERT INTO claims (worker_id, policy_id, trigger_type, disruption_date, zone_id,
          hours_lost, payout_amount, status, auto_generated, fraud_flag, fraud_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10) RETURNING *`,
        [
          row.worker_id,
          row.policy_id,
          trigger_type,
          today,
          zone_id,
          hours_lost,
          finalPayout,
          velocityCheck.isFlagged ? 'flagged' : 'approved',
          velocityCheck.isFlagged,
          velocityCheck.isFlagged ? velocityCheck.reason : null,
        ]
      );

      createdClaims.push(claimRes.rows[0]);
    }

    console.log(`[TriggerEngine] Created ${createdClaims.length} claims for disruption ${disruptionId}`);
    return createdClaims;
  } catch (err) {
    console.error('[TriggerEngine] Error creating auto claims:', err);
    throw err;
  }
};

/**
 * Check triggers for a specific zone and create disruption records if thresholds are crossed.
 */
const checkZoneTriggers = async (zoneId) => {
  const createdDisruptions = [];

  try {
    const zoneRes = await query('SELECT * FROM zones WHERE id = $1', [zoneId]);
    if (zoneRes.rowCount === 0) {
      console.warn(`[TriggerEngine] Zone ${zoneId} not found.`);
      return [];
    }

    const zone = zoneRes.rows[0];
    console.log(`[TriggerEngine] Checking triggers for zone: ${zone.name}`);

    // Get weather
    const weather = await getWeatherForZone(zone);
    const aqiData = await getAQIForZone(zone);

    const checks = [
      {
        trigger_type: 'heavy_rain',
        value: weather.rainfall_mm_today,
        threshold: THRESHOLDS.heavy_rain.value,
      },
      {
        trigger_type: 'extreme_heat',
        value: weather.temperature_c,
        threshold: THRESHOLDS.extreme_heat.value,
      },
      {
        trigger_type: 'severe_aqi',
        value: aqiData.aqi,
        threshold: THRESHOLDS.severe_aqi.value,
      },
    ];

    for (const check of checks) {
      if (check.value > check.threshold) {
        // Check if disruption already active for this zone+trigger
        const existing = await query(
          `SELECT id FROM disruptions WHERE zone_id = $1 AND trigger_type = $2 AND is_active = true`,
          [zoneId, check.trigger_type]
        );

        if (existing.rowCount > 0) {
          console.log(`[TriggerEngine] Disruption already active: ${zone.name} / ${check.trigger_type}`);
          continue;
        }

        const disruptionRes = await query(
          `INSERT INTO disruptions (zone_id, trigger_type, trigger_value, threshold_value, is_active)
           VALUES ($1, $2, $3, $4, true) RETURNING *`,
          [zoneId, check.trigger_type, check.value, check.threshold]
        );

        const disruption = disruptionRes.rows[0];
        console.log(
          `[TriggerEngine] New disruption: ${zone.name} / ${check.trigger_type} = ${check.value} (threshold: ${check.threshold})`
        );

        // Auto-create claims
        await createAutoClaimsForDisruption(disruption);
        createdDisruptions.push(disruption);
      } else {
        // If was active and now below threshold, mark as resolved
        const activeRes = await query(
          `SELECT id FROM disruptions WHERE zone_id = $1 AND trigger_type = $2 AND is_active = true`,
          [zoneId, check.trigger_type]
        );
        if (activeRes.rowCount > 0) {
          await query(
            `UPDATE disruptions SET is_active = false, ended_at = NOW()
             WHERE zone_id = $1 AND trigger_type = $2 AND is_active = true`,
            [zoneId, check.trigger_type]
          );
          console.log(`[TriggerEngine] Disruption resolved: ${zone.name} / ${check.trigger_type}`);
        }
      }
    }

    return createdDisruptions;
  } catch (err) {
    console.error(`[TriggerEngine] Error checking zone ${zoneId}:`, err);
    throw err;
  }
};

/**
 * Check all active zones (zones that have active policies).
 */
const checkAllActiveTriggers = async () => {
  console.log('[TriggerEngine] Running checkAllActiveTriggers...');

  try {
    const zonesRes = await query(
      `SELECT DISTINCT z.id FROM zones z
       JOIN policies p ON p.zone_id = z.id
       WHERE p.status = 'active'`
    );

    const results = [];
    for (const row of zonesRes.rows) {
      const disruptions = await checkZoneTriggers(row.id);
      results.push({ zone_id: row.id, disruptions_created: disruptions.length });
    }

    console.log(`[TriggerEngine] Completed. Checked ${results.length} zones.`);
    return results;
  } catch (err) {
    console.error('[TriggerEngine] checkAllActiveTriggers error:', err);
    throw err;
  }
};

module.exports = {
  checkAllActiveTriggers,
  checkZoneTriggers,
  createAutoClaimsForDisruption,
  calculatePayout,
  estimateHoursLost,
};
