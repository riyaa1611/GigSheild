const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../redis');

const redisStoreConfig = {
  // express-rate-limit 7+ needs a sendCommand wrapper for ioredis/node-redis differences
  sendCommand: (...args) => redisClient.sendCommand(args),
};

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP or Phone to 3 OTP requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    ...redisStoreConfig,
    prefix: 'rl:otp:',
  }),
  message: { error: true, code: 'RATE_LIMIT', message: 'Too many OTP requests. Please try again after an hour.' },
  // Since we want to limit by phone number for OTP (if provided), we can define a key generator
  keyGenerator: (req) => {
    return req.body.phone || req.ip;
  }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    ...redisStoreConfig,
    prefix: 'rl:global:',
  }),
  message: { error: true, code: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' }
});

module.exports = {
  otpLimiter,
  globalLimiter
};
