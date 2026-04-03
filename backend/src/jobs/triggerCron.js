const cron = require('node-cron');
const { checkAllActiveTriggers } = require('../services/triggerEngine');

/**
 * Initialize and start the every 15-minute cron job for the Trigger Engine.
 */
const initCron = () => {
  // schedule for every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Running 15m trigger evaluation check...');
    try {
      await checkAllActiveTriggers();
    } catch (err) {
      console.error('[Cron] Trigger engine error:', err);
    }
  });

  console.log('[Cron] Trigger Engine 15-minute polling job scheduled.');
};

module.exports = {
  initCron
};
