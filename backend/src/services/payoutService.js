const axios = require('axios');
const twilio = require('twilio');
const { pool } = require('../db/index');
const redisClient = require('../redis');
const { payoutsQueue } = require('./claimsService');
const payoutSocket = require('../sockets/payoutSocket');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = (TWILIO_SID && TWILIO_AUTH_TOKEN) ? twilio(TWILIO_SID, TWILIO_AUTH_TOKEN) : null;

const sendSms = async (phone, body) => {
  if (twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body,
        from: TWILIO_PHONE,
        to: phone.startsWith('+91') ? phone : `+91${phone}`
      });
    } catch (e) {
      console.error('[PayoutService] Twilio error:', e.message);
    }
  } else {
    console.log(`[PayoutService] MOCK SMS to ${phone}: ${body}`);
  }
};

payoutsQueue.process(async (job) => {
  const { claimId, payoutAmount } = job.data;
  console.log(`[PayoutQueue] Processing payout for claim: ${claimId}, amount: ₹${payoutAmount}`);

  try {
    // Step 1: Fetch full context
    const { rows } = await pool.query(`
      SELECT c.*, p.plan_type, u.upi_handle, u.razorpay_fund_account_id, u.phone, t.type as trigger_type 
      FROM claims c
      JOIN policies p ON p.id = c.policy_id
      JOIN users u ON u.id = c.user_id
      JOIN triggers t ON t.id = c.trigger_id
      WHERE c.id = $1
    `, [claimId]);

    if (rows.length === 0) throw new Error('Claim not found');
    const claimData = rows[0];

    // Check if payout record already exists
    let { rows: existingPayouts } = await pool.query(
      `SELECT id, attempt_count FROM payouts WHERE claim_id = $1 ORDER BY created_at DESC LIMIT 1`, 
      [claimId]
    );

    let payoutId;
    let attemptCount = 0;

    if (existingPayouts.length === 0) {
      // Step 2: Create payout record
      const insertRes = await pool.query(
        `INSERT INTO payouts (claim_id, user_id, amount, status, upi_handle, attempt_count)
         VALUES ($1, $2, $3, 'processing', $4, 0) RETURNING id`,
        [claimId, claimData.user_id, payoutAmount, claimData.upi_handle]
      );
      payoutId = insertRes.rows[0].id;
    } else {
      payoutId = existingPayouts[0].id;
      attemptCount = existingPayouts[0].attempt_count;
    }

    // Step 3: POST to Razorpay (Mocked)
    console.log(`[PayoutQueue] Initiating Razorpay payout ${payoutId}`);
    
    // Simulate network latency & random 10% failure chance natively
    const razorpaySuccess = Math.random() > 0.1;

    if (razorpaySuccess) {
      // Step 4: SUCCESS
      const rzpPayoutId = `mock_pout_${Date.now()}`;
      await pool.query(
        `UPDATE payouts SET status = 'success', razorpay_payout_id = $1, paid_at = NOW() WHERE id = $2`,
        [rzpPayoutId, payoutId]
      );
      await pool.query(`UPDATE claims SET status = 'paid' WHERE id = $1`, [claimId]);
      await pool.query(`UPDATE users SET loyalty_score = loyalty_score + 1 WHERE id = $1`, [claimData.user_id]);

      const successPayload = {
        amount: payoutAmount,
        triggerType: claimData.trigger_type,
        triggerId: claimData.trigger_id,
        paidAt: new Date(),
        payoutId: payoutId
      };

      payoutSocket.emitPayoutSuccess(claimData.user_id, successPayload);
      await sendSms(claimData.phone, `GigShield: ₹${payoutAmount} credited for ${claimData.trigger_type} disruption in your area. Your income is protected.`);
    } else {
      throw new Error('Razorpay generic connectivity error');
    }
  } catch (err) {
    // Step 5: FAILURE 
    console.error(`[PayoutQueue] Payout failed for claim ${claimId}`, err.message);
    
    let { rows: currentPayout } = await pool.query(`SELECT id, attempt_count FROM payouts WHERE claim_id = $1`, [claimId]);
    if (currentPayout.length > 0) {
      let currentAttempt = currentPayout[0].attempt_count + 1;
      await pool.query(`UPDATE payouts SET attempt_count = $1 WHERE id = $2`, [currentAttempt, currentPayout[0].id]);

      if (currentAttempt < 3) {
        // Increment and retry
        await redisClient.setEx(`payout:retry:${claimId}`, 3600, currentAttempt.toString());
        // Bull backoff simulation: add back manually with delay
        await payoutsQueue.add({ claimId, payoutAmount }, { delay: 5 * 60 * 1000 }); 
      } else {
        // Complete failure
        await pool.query(`UPDATE payouts SET status = 'failed', failure_reason = $1 WHERE id = $2`, [err.message, currentPayout[0].id]);
        await pool.query(`UPDATE claims SET status = 'payout_failed' WHERE id = $1`, [claimId]);
        
        payoutSocket.emitPayoutFailed({ claimId, reason: err.message });
        
        const { rows } = await pool.query(`SELECT phone FROM users JOIN claims ON claims.user_id = users.id WHERE claims.id = $1`, [claimId]);
        if (rows.length) {
          await sendSms(rows[0].phone, `GigShield: Payout delayed for claim ${claimId}. Our team is on it.`);
        }
      }
    }
  }

  return { success: true };
});

const startPayoutProcessor = () => {
  console.log('[PayoutQueue] Processor initialized, awaiting claims...');
};

module.exports = {
  startPayoutProcessor
};
