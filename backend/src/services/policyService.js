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
  const cachedMultiplier = await redisClient.get(`premium:ml:${userId}`);
  let multiplier = 1.0;

  if (cachedMultiplier) {
    multiplier = parseFloat(cachedMultiplier);
  } else {
    // Fetch user's zone and platform from users table
    const { rows: userRows } = await pool.query(
      `SELECT pincode, zone_lat, zone_lng, platform_type,
              declared_weekly_hours, loyalty_score
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = userRows[0] || {};
    const pincode = user.pincode || '400001';
    const platform = user.platform_type || 'zomato';
    const lat = parseFloat(user.zone_lat) || 19.0760;
    const lng = parseFloat(user.zone_lng) || 72.8777;

    try {
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/premium`, {
        userId: userId.toString(),
        zonePincode: pincode.toString(),
        zoneLat: lat,
        zoneLng: lng,
        platform: platform,
        avgWeeklyHours: parseFloat(user.declared_weekly_hours) || 40.0,
        claimHistoryCount: 0,
        currentMonth: new Date().getMonth() + 1,
        zoneRiskScore: 0.5
      });
      multiplier = mlResponse.data.multiplier || 1.0;
    } catch (err) {
      console.error('[PolicyService] ML Service failed, defaulting multiplier to 1.0', err.message);
      multiplier = 1.0;
    }

    await redisClient.setEx(`premium:ml:${userId}`, 86400, multiplier.toString());
  }

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
  const diff = (7 - day) % 7 || 7; // if today is Sunday, next Sunday is 7 days away
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

const subscribePlan = async (userId, planType, upiHandle) => {
  const activeCheck = await getActivePolicy(userId);
  if (activeCheck && activeCheck.status === 'active') {
    throw { status: 409, message: 'Active policy already exists' };
  }

  if (!BASE_PLANS[planType]) throw { status: 400, message: 'Invalid planType' };

  const plans = await getPlans(userId);
  const selectedPlan = plans[planType];
  const nextSunday = getNextSundayEndTime();

  // Derive hourly rate from user's declared earnings
  const { rows: userRows } = await pool.query(
    `SELECT declared_weekly_earnings, declared_weekly_hours, upi_handle FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRows[0] || {};
  const earnings = parseFloat(user.declared_weekly_earnings) || 4200;
  const hours = parseFloat(user.declared_weekly_hours) || 56;
  const hourlyRate = parseFloat((earnings / hours).toFixed(2));

  // Update UPI handle if provided
  if (upiHandle) {
    await pool.query(`UPDATE users SET upi_handle = $1 WHERE id = $2`, [upiHandle, userId]);
  }

  let subscriptionId = `mock_rzp_sub_${Date.now()}`;
  try {
    if (process.env.RAZORPAY_KEY_ID) {
      const planRes = await rzp.plans.create({
        period: 'weekly',
        interval: 1,
        item: {
          name: `GigShield ${planType} plan`,
          amount: Math.round(selectedPlan.adjustedPremium * 100),
          currency: 'INR'
        }
      });
      const sub = await rzp.subscriptions.create({
        plan_id: planRes.id,
        total_count: 52,
        customer_notify: 1
      });
      subscriptionId = sub.id;
    }
  } catch (err) {
    console.error('[PolicyService] Razorpay setup failed', err.message);
  }

  const { rows } = await pool.query(
    `INSERT INTO policies (user_id, plan_type, weekly_premium, coverage_cap, hourly_rate, status, razorpay_subscription_id, start_at, ends_at, ml_premium_multiplier)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW(), $7, $8) RETURNING id`,
    [
      userId,
      planType,
      selectedPlan.adjustedPremium,
      selectedPlan.coverageCap,
      hourlyRate,
      subscriptionId,
      nextSunday,
      parseFloat((selectedPlan.adjustedPremium / selectedPlan.weeklyPremium).toFixed(2))
    ]
  );

  const policyId = rows[0].id;

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
    `SELECT * FROM policies WHERE user_id = $1 AND status = 'active' ORDER BY start_at DESC LIMIT 1`,
    [userId]
  );

  if (rows.length > 0) {
    const p = rows[0];
    const planType = p.plan_type;
    const normalized = {
      id: p.id,
      plan: planType,
      plan_type: planType,
      coverageCap: parseFloat(p.coverage_cap),
      coverage_cap: parseFloat(p.coverage_cap),
      adjustedPremium: parseFloat(p.weekly_premium),
      weekly_premium: parseFloat(p.weekly_premium),
      hourlyRate: parseFloat(p.hourly_rate),
      hourly_rate: parseFloat(p.hourly_rate),
      triggers: (BASE_PLANS[planType] || {}).triggers || [],
      status: p.status,
      start_at: p.start_at,
      ends_at: p.ends_at,
      ml_premium_multiplier: p.ml_premium_multiplier
    };
    await redisClient.setEx(`policy:active:${userId}`, 86400 * 7, JSON.stringify(normalized));
    return normalized;
  }

  return null;
};

const cancelPolicy = async (userId) => {
  const policy = await getActivePolicy(userId);
  if (!policy || policy.status !== 'active') {
    throw { status: 400, message: 'No active policy found' };
  }

  const planType = policy.plan_type || policy.plan;
  const isUltra = planType === 'ultra';

  let refundAmount = 0;
  if (isUltra) {
    const now = new Date();
    const endsAt = new Date(policy.ends_at);
    const msDiff = endsAt.getTime() - now.getTime();
    if (msDiff > 0) {
      const daysRemaining = msDiff / (1000 * 3600 * 24);
      const plans = await getPlans(userId);
      const weeklyPremium = plans['ultra'].adjustedPremium;
      refundAmount = parseFloat(((weeklyPremium / 7) * daysRemaining).toFixed(2));
      console.log(`[PolicyService] Initiating partial refund of ₹${refundAmount} for UltraShield.`);
    }
  }

  if (policy.razorpay_subscription_id && !policy.razorpay_subscription_id.startsWith('mock_')) {
    try {
      await rzp.subscriptions.cancel(policy.razorpay_subscription_id);
    } catch (e) { console.error('Razorpay cancel fail', e.message); }
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
