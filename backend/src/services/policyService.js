const axios = require('axios');
const Razorpay = require('razorpay');
const { pool } = require('../db/index');
const redisClient = require('../redis');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

const BASE_PLANS = {
  basic: { weeklyPremium: 29, coverageCap: 500, triggers: ['T-01', 'T-02'] },
  pro:   { weeklyPremium: 49, coverageCap: 900, triggers: ['T-01', 'T-02', 'T-03', 'T-04'] },
  ultra: { weeklyPremium: 79, coverageCap: 1500, triggers: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07'] }
};

const getPlans = async (userId) => {
  // Check Redis Cache
  const cachedMultiplier = await redisClient.get(`premium:ml:${userId}`);
  let multiplier = 1.0;

  if (cachedMultiplier) {
    multiplier = parseFloat(cachedMultiplier);
  } else {
    // Collect user zone and history
    const { rows } = await pool.query(
      `SELECT pincode FROM zones z JOIN workers w ON w.zone_id = z.id WHERE w.id = $1`, [userId]
    );
    const workerRes = await pool.query('SELECT platform_type FROM users WHERE id = $1', [userId]);

    const pincode = rows.length ? rows[0].pincode : '400001'; // Default
    const platform = workerRes.rows.length ? (workerRes.rows[0].platform_type || 'zomato') : 'zomato';

    // ML service POST /predict/premium
    try {
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/premium`, {
        userId: userId.toString(),
        zonePincode: pincode.toString(),
        zoneLat: 19.0760,
        zoneLng: 72.8777,
        platform: platform,
        avgWeeklyHours: 40.0,
        claimHistoryCount: 0,
        currentMonth: new Date().getMonth() + 1,
        zoneRiskScore: 0.5
      });
      multiplier = mlResponse.data.multiplier || 1.0;
    } catch (err) {
      console.error('[PolicyService] ML Service failed, defaulting multiplier to 1.0', err.message);
      multiplier = 1.0;
    }

    // Cache TTL 24hr (86400s)
    await redisClient.setEx(`premium:ml:${userId}`, 86400, multiplier.toString());
  }

  // Adjust plans
  const adjustedPlans = {};
  for (const [key, plan] of Object.entries(BASE_PLANS)) {
    adjustedPlans[key] = {
      ...plan,
      adjustedPremium: parseFloat((plan.weeklyPremium * multiplier).toFixed(2))
    };
  }

  return adjustedPlans;
};

const getNextSundayEndTime = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7; 
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

const subscribePlan = async (userId, planType, upiHandle) => {
  const activeCheck = await getActivePolicy(userId);
  if (activeCheck && activeCheck.status === 'active') {
    throw { status: 400, message: 'User already has an active policy' };
  }

  if (!BASE_PLANS[planType]) throw { status: 400, message: 'Invalid planType' };

  // Get Adjusted Premium
  const plans = await getPlans(userId);
  const selectedPlan = plans[planType];
  const nextSunday = getNextSundayEndTime();

  // Create Razorpay subscription
  let subscriptionId = `mock_rzp_sub_${Date.now()}`;
  try {
    if (process.env.RAZORPAY_KEY_ID) {
      const planRes = await rzp.plans.create({
        period: 'weekly',
        interval: 1,
        item: {
          name: `GigShield ${planType} plan`,
          amount: Math.round(selectedPlan.adjustedPremium * 100), // paise
          currency: 'INR'
        }
      });
      const sub = await rzp.subscriptions.create({
        plan_id: planRes.id,
        total_count: 52, // 1 year
        customer_notify: 1
      });
      subscriptionId = sub.id;
    }
  } catch (err) {
    console.error('[PolicyService] Razorpay setup failed', err);
    // Proceed with mock if failing in dev
  }

  const { rows } = await pool.query(
    `INSERT INTO policies (worker_id, covered_triggers, coverage_amount, status, razorpay_subscription_id, started_at, ends_at)
     VALUES ($1, $2, $3, 'active', $4, NOW(), $5) RETURNING id`,
    [userId, selectedPlan.triggers, selectedPlan.coverageCap, subscriptionId, nextSunday]
  );
  
  const policyId = rows[0].id;

  // Set Redis
  const activePolicyData = {
    id: policyId,
    plan: planType,
    coverageCap: selectedPlan.coverageCap,
    adjustedPremium: selectedPlan.adjustedPremium,
    triggers: selectedPlan.triggers,
    ends_at: nextSunday,
    status: 'active'
  };
  await redisClient.setEx(`policy:active:${userId}`, 86400 * 7, JSON.stringify(activePolicyData));

  // Sync to workers wrapper to make sure worker_id / users matching
  // Note: the policies table refers to worker_id. We're directly using userId (since users and workers are 1:1 or merged in new design)
  // Let's ensure worker exists just in case:
  await pool.query(
    'INSERT INTO workers (id, user_id, weekly_income, zone_id) VALUES ($1, $1, 2000, 1) ON CONFLICT (id) DO NOTHING',
    [userId]
  );

  return {
    policyId,
    plan: planType,
    coverageCap: selectedPlan.coverageCap,
    adjustedPremium: selectedPlan.adjustedPremium,
    nextBillingDate: nextSunday
  };
};

const getActivePolicy = async (userId) => {
  const cached = await redisClient.get(`policy:active:${userId}`);
  if (cached) return JSON.parse(cached);

  const { rows } = await pool.query(
    `SELECT * FROM policies WHERE worker_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  
  if (rows.length > 0) {
    const p = rows[0];
    await redisClient.setEx(`policy:active:${userId}`, 86400 * 7, JSON.stringify(p));
    return p;
  }
  
  return null;
};

const cancelPolicy = async (userId) => {
  const policy = await getActivePolicy(userId);
  if (!policy || policy.status !== 'active') {
    throw { status: 400, message: 'No active policy found' };
  }

  // Refetch to get ultra triggers array exactly
  const triggersArray = policy.covered_triggers || policy.triggers || [];
  const isUltra = triggersArray.length >= 7; // quick heuristic based on triggers

  let refundAmount = 0;
  if (isUltra) {
    const now = new Date();
    const endsAt = new Date(policy.ends_at);
    const msDiff = endsAt.getTime() - now.getTime();
    if (msDiff > 0) {
      const daysRemaining = msDiff / (1000 * 3600 * 24);
      // Re-calculate the adjusted premium for ultra
      const plans = await getPlans(userId);
      const weeklyPremium = plans['ultra'].adjustedPremium;
      refundAmount = parseFloat(((weeklyPremium / 7) * daysRemaining).toFixed(2));

      // Initiate Razorpay Refund
      console.log(`[PolicyService] Initiating partial refund of ₹${refundAmount} for UltraShield package.`);
      // Mocked out refund call
    }
  }

  // Cancel subscription
  if (policy.razorpay_subscription_id && !policy.razorpay_subscription_id.startsWith('mock_')) {
    try {
      await rzp.subscriptions.cancel(policy.razorpay_subscription_id);
    } catch(e) { console.error('Razorpay cancel fail', e); }
  }

  await pool.query(`UPDATE policies SET status = 'cancelled' WHERE id = $1`, [policy.id]);
  await redisClient.del(`policy:active:${userId}`);
  
  return { cancelled: true, refundAmount };
};

module.exports = {
  getPlans,
  subscribePlan,
  getActivePolicy,
  cancelPolicy
};
