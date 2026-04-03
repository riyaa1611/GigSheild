const Queue = require('bull');
const axios = require('axios');
const { pool } = require('../db/index');
const redisClient = require('../redis');
const socketModule = require('../socket');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const claimsQueue = new Queue('claims-queue', REDIS_URL);
const payoutsQueue = new Queue('payouts-queue', REDIS_URL);

/**
 * Haversine distance in km
 */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Plan trigger coverage
const PLAN_COVERAGE = {
  basic: ['T-01', 'T-02'],
  pro:   ['T-01', 'T-02', 'T-03', 'T-04'],
  ultra: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07']
};

claimsQueue.process(async (job) => {
  const { triggerId, type, zonePincode, severity, thresholdValue, triggeredAt } = job.data;
  console.log(`[ClaimsQueue] Processing trigger ${triggerId} (${type}) for zone ${zonePincode}`);

  // Step 1: Filter eligible policies
  const { rows: pendingProfiles } = await pool.query(
    `SELECT * FROM v_active_policies WHERE pincode = $1`,
    [zonePincode]
  );

  for (const profile of pendingProfiles) {
    try {
      // Check Plan limits
      const coveredTriggers = PLAN_COVERAGE[profile.plan_type] || [];
      if (!coveredTriggers.includes(type)) {
        continue;
      }

      // Step 2: Context validation per worker
      const pingDataRaw = await redisClient.get(`worker:lastping:${profile.user_id}`);
      if (!pingDataRaw) {
        console.log(`[ClaimsQueue] Skipped ${profile.user_id}: No recent ping found.`);
        continue;
      }
      
      const pingData = JSON.parse(pingDataRaw);
      const pingTime = new Date(pingData.timestamp).getTime();
      const nowTime = new Date().getTime();
      
      if ((nowTime - pingTime) > 2 * 60 * 60 * 1000) { // 2 hours
        console.log(`[ClaimsQueue] Skipped ${profile.user_id}: Ping older than 2 hours.`);
        continue;
      }

      // Haversine distance from ping to zone_lat/lng
      // We assume pingData has lat/lng, and profile has zone_lat/lng
      const distance = getDistanceKm(pingData.lat || profile.zone_lat, pingData.lng || profile.zone_lng, profile.zone_lat, profile.zone_lng);
      if (distance > 5) {
        console.log(`[ClaimsQueue] Skipped ${profile.user_id}: Worker > 5km from zone (Distance: ${distance.toFixed(2)}km).`);
        continue;
      }

      const platformActive = await redisClient.get(`platform:active:${profile.user_id}`);
      if (!platformActive) {
        console.log(`[ClaimsQueue] Skipped ${profile.user_id}: Platform active status not set.`);
        continue;
      }

      // Step 3: Fraud scoring
      let fraudScore = 0.0;
      try {
        const mlRes = await axios.post(`${ML_SERVICE_URL}/score/fraud`, {
          userId: profile.user_id,
          triggerId: triggerId,
          gpsLat: pingData.lat || profile.zone_lat,
          gpsLng: pingData.lng || profile.zone_lng,
          deviceFingerprint: "fp_auth_worker",
          claimCount30days: 0,
          platformActiveStatus: true,
          triggerZonePincode: zonePincode
        });
        fraudScore = mlRes.data.fraudScore || 0.0;
      } catch (err) {
        console.error('[ClaimsQueue] ML Fraud Service failed, falling back to 0.0', err.message);
      }

      // Step 4: Claim creation based on fraud_score
      let status = 'pending';
      if (fraudScore < 0.3) {
        status = 'approved';
      } else if (fraudScore <= 0.7) {
        status = 'flagged_secondary';
        // Run secondary GPS cross check (mocked)
        const consistent = Math.random() > 0.5; 
        if (consistent) {
          fraudScore = 0.2; // rescore override
          status = 'approved';
        } else {
          status = 'manual_review';
        }
      } else {
        status = 'manual_review';
      }

      // Calculate payout variables
      // hoursDisrupted = min(trigger duration hrs, 8). We'll assume a generic multiplier based on severity
      const severityMap = { 'low': 2, 'medium': 4, 'high': 6, 'critical': 8 };
      let hoursDisrupted = severityMap[severity.toLowerCase()] || 4;
      hoursDisrupted = Math.min(hoursDisrupted, 8);

      const hourlyRate = profile.hourly_rate > 0 ? parseFloat(profile.hourly_rate) : 75.0; // fallback default
      let payoutAmount = hoursDisrupted * hourlyRate;
      payoutAmount = Math.min(payoutAmount, parseFloat(profile.coverage_cap));
      payoutAmount = Math.round(payoutAmount / 10) * 10; // Round to nearest 10

      // Step 5: INSERT Claim Record
      const { rows } = await pool.query(
        `INSERT INTO claims (
          user_id, policy_id, trigger_id, hours_disrupted, hourly_rate, payout_amount,
          fraud_score, status, gps_lat, gps_lng, context_validated_at,
          gps_zone_match, last_ping_within_2hr, platform_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), true, true, true) RETURNING id`,
        [
          profile.user_id,
          profile.policy_id,
          triggerId,
          hoursDisrupted,
          hourlyRate,
          payoutAmount,
          fraudScore,
          status,
          pingData.lat || profile.zone_lat,
          pingData.lng || profile.zone_lng
        ]
      );
      
      const claimId = rows[0].id;
      console.log(`[ClaimsQueue] Claim created: ${claimId} with status: ${status}. Payout: ${payoutAmount}`);

      // Step 6: Post-creation Events
      try {
        const io = socketModule.getIo();
        io.emit('claim:created', { claimId, userId: profile.user_id, status, payoutAmount });
        if (status === 'manual_review') {
          io.to('admin_room').emit('claim:flagged', { claimId, fraudScore });
        }
      } catch(e) {}

      if (status === 'approved') {
        await payoutsQueue.add({ claimId, payoutAmount });
      }

    } catch (err) {
      console.error(`[ClaimsQueue] Failed evaluating policy/user ${profile.user_id}`, err);
    }
  }

  // Done processing
  return { success: true };
});

const startClaimsProcessor = () => {
  console.log('[ClaimsQueue] Processor initialized, waiting for triggers...');
};

module.exports = {
  startClaimsProcessor,
  claimsQueue,
  payoutsQueue
};
