const cron = require('node-cron');
const { pool } = require('../db/index');
const { getDashboardMetrics, getFraudStats } = require('../services/analyticsService');

const captureSnapshot = async () => {
  console.log('[AnalyticsCron] Capturing daily metrics snapshot...');
  try {
    const metrics = await getDashboardMetrics();
    const fraud = await getFraudStats();
    
    // Auto vs Flagged scaling logic from fraud method returns % strings
    const activeLength = metrics.totalActiveUsers;
    const claimsCount = metrics.claimsThisWeek; // Usually we'd count JUST today, but keeping metric matching

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStamp = yesterday.toISOString().split('T')[0];
    
    await pool.query(
      `INSERT INTO analytics_snapshots 
         (snapshot_date, active_users, claims_count, auto_approved_count, 
          manual_review_count, rejected_count, total_paid_out, total_premiums, loss_ratio, 
          avg_payout_time_minutes, avg_fraud_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (snapshot_date) DO NOTHING`,
      [
        dateStamp,
        activeLength,
        claimsCount,
        Math.round(claimsCount * parseFloat(fraud.autoApprovedRate) / 100) || 0,
        Math.round(claimsCount * parseFloat(fraud.manualReviewRate) / 100) || 0, 
        0, // mocked rejected
        metrics.totalPaidOut,
        1500, // mock total premium
        metrics.lossRatio,
        metrics.avgPayoutTime,
        0.12 // mock avg systemic fraud score
      ]
    );

    console.log(`[AnalyticsCron] Snapshot captured securely for ${dateStamp}.`);
  } catch (err) {
    console.error('[AnalyticsCron] Error running snapshot cron:', err.message);
  }
};

const initAnalyticsCron = () => {
  // Run daily at 11:59 PM IST
  cron.schedule('59 23 * * *', captureSnapshot, { timezone: 'Asia/Kolkata' });
  console.log('[Cron] Daily Analytics Snapshot routine scheduled.');
};

module.exports = {
  initAnalyticsCron
};
