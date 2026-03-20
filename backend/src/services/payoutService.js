const { query } = require('../db/index');

/**
 * Initiate a payout for an approved claim.
 * Creates a payout record with status=processing, then starts async mock processing.
 * @param {number} claimId
 * @returns {Promise<Object>} - the created payout record
 */
const initiatePayout = async (claimId) => {
  // Get claim details
  const claimRes = await query(
    `SELECT c.*, w.upi_id, w.id AS worker_id
     FROM claims c
     JOIN workers w ON c.worker_id = w.id
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimRes.rowCount === 0) {
    throw new Error(`Claim ${claimId} not found.`);
  }

  const claim = claimRes.rows[0];

  if (claim.status !== 'approved') {
    throw new Error(`Claim ${claimId} is not in approved status.`);
  }

  // Create payout record
  const paymentMethod = claim.upi_id ? 'upi' : 'bank_transfer';

  const payoutRes = await query(
    `INSERT INTO payouts (claim_id, worker_id, amount, status, payment_method)
     VALUES ($1, $2, $3, 'processing', $4)
     RETURNING *`,
    [claimId, claim.worker_id, claim.payout_amount, paymentMethod]
  );

  const payout = payoutRes.rows[0];

  // Update claim status to 'paid' (processing begins)
  await query(
    `UPDATE claims SET status = 'paid', paid_at = NOW() WHERE id = $1`,
    [claimId]
  );

  // Start async mock processing (non-blocking)
  processPayoutMock(payout.id).catch((err) =>
    console.error(`[PayoutService] Mock processing error for payout ${payout.id}:`, err)
  );

  return payout;
};

/**
 * Simulate Razorpay-style payment processing.
 * Generates a mock transaction_id and marks payout as completed after a short delay.
 * @param {number} payoutId
 */
const processPayoutMock = async (payoutId) => {
  // Simulate payment gateway delay (2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Generate mock transaction ID (Razorpay format: pay_XXXX)
    const transactionId = `pay_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const result = await query(
      `UPDATE payouts
       SET status = 'completed', transaction_id = $1, completed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [transactionId, payoutId]
    );

    if (result.rowCount > 0) {
      const payout = result.rows[0];
      console.log(
        `[PayoutService] Payout ${payoutId} completed. Transaction: ${transactionId}, Amount: ₹${payout.amount}`
      );
    } else {
      console.warn(`[PayoutService] Payout ${payoutId} not found during mock processing.`);
    }
  } catch (err) {
    // Mark payout as failed
    await query(
      `UPDATE payouts SET status = 'failed' WHERE id = $1`,
      [payoutId]
    ).catch((updateErr) =>
      console.error(`[PayoutService] Failed to mark payout ${payoutId} as failed:`, updateErr)
    );

    throw err;
  }
};

module.exports = { initiatePayout, processPayoutMock };
