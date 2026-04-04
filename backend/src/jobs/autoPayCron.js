const cron = require('node-cron');
const twilio = require('twilio');
const { pool } = require('../db/index');
const redisClient = require('../redis');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = (TWILIO_SID && TWILIO_AUTH_TOKEN) 
  ? twilio(TWILIO_SID, TWILIO_AUTH_TOKEN) 
  : null;

const sendSms = async (phone, body) => {
  if (twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body,
        from: TWILIO_PHONE,
        to: phone.startsWith('+91') ? phone : `+91${phone}`
      });
    } catch (err) {
      console.error('[AutoPay] Twilio error:', err.message);
    }
  } else {
    console.log(`[AutoPay] MOCK SMS to ${phone}: ${body}`);
  }
};

const processBilling = async () => {
  console.log('[AutoPayCron] Starting Monday 6AM AutoPay billing sweep...');
  
  try {
    const { rows: policies } = await pool.query(`
      SELECT p.id, p.user_id, p.razorpay_subscription_id, u.phone
      FROM policies p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'active'
    `);

    for (const policy of policies) {
      // Typically Razorpay handles recurring charges automatically based on the subscription.
      // However, per instructions, we are mocking/triggering a charge or checking failure logic here.
      // Let's assume a random 5% failure rate for simulation if mocked.
      let paymentFailed = Math.random() < 0.05; 

      if (paymentFailed) {
        // Suspend policy
        await pool.query('UPDATE policies SET status = $1 WHERE id = $2', ['suspended', policy.id]);

        // Clear active Redis Cache
        await redisClient.del(`policy:active:${policy.user_id}`);

        // Set grace period key (24hr)
        await redisClient.setEx(`policy:grace:${policy.user_id}`, 86400, 'active');

        // Send SMS
        await sendSms(policy.phone, "GigShield: Payment failed. 24hr grace period active.");
      } else {
        // Extend validity to NEXT Sunday (since charged successfully)
        const d = new Date();
        const diff = (7 - d.getDay()) % 7; 
        d.setDate(d.getDate() + diff);
        d.setHours(23, 59, 59, 999);
        
        await pool.query('UPDATE policies SET ends_at = $1 WHERE id = $2', [d, policy.id]);

        // Clear active Cache so it refreshes with new ends_at
        await redisClient.del(`policy:active:${policy.user_id}`);
      }
    }
  } catch (error) {
    console.error('[AutoPayCron] Billing process failed:', error);
  }
};

const processGracePeriod = async () => {
  console.log('[AutoPayCron] Starting Tuesday 6AM Grace Period sweep...');
  
  try {
    const { rows: suspendedPolicies } = await pool.query(`
      SELECT p.id, p.user_id, u.phone
      FROM policies p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'suspended'
    `);

    for (const policy of suspendedPolicies) {
      // Check if they paid during grace
      const inGrace = await redisClient.get(`policy:grace:${policy.user_id}`);
      
      // If grace expired and still suspended
      if (!inGrace) {
        // We keep it suspended (or could cancel it)
        await sendSms(policy.phone, "GigShield: Your policy is suspended due to unpaid dues. Please update payment.");
      }
    }
  } catch (error) {
    console.error('[AutoPayCron] Grace period sweep failed:', error);
  }
};

const initAutoPayCron = () => {
  // Monday 06:00 IST
  cron.schedule('0 6 * * 1', processBilling, { timezone: "Asia/Kolkata" });
  
  // Tuesday 06:00 IST (Grace period check)
  cron.schedule('0 6 * * 2', processGracePeriod, { timezone: "Asia/Kolkata" });

  // TODO: add Razorpay webhook handler for payment confirmation to mark active again

  console.log('[Cron] AutoPay billing and grace period routines scheduled.');
};

module.exports = {
  initAutoPayCron
};
