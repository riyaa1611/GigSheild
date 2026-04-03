const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('[Redis] Client Error', err));
redisClient.on('connect', () => console.log('[Redis] Connected to Redis'));

// Connect immediately
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[Redis] Failed to connect on startup:', err);
  }
})();

module.exports = redisClient;
