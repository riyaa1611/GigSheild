const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const redisClient = require('../redis');
const { pool } = require('../db/index');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Initialize Twilio client if keys are provided
const twilioClient = (TWILIO_SID && TWILIO_AUTH_TOKEN) 
  ? twilio(TWILIO_SID, TWILIO_AUTH_TOKEN) 
  : null;

/**
 * Validates Indian phone number format (e.g. +91 9999999999 or 9999999999)
 */
const validateIndianPhone = (phone) => {
  const phoneRegex = /^(?:\+91[-. ]?)?[6789]\d{9}$/;
  return phoneRegex.test(phone);
};

const sendOtp = async (phone) => {
  if (!validateIndianPhone(phone)) {
    throw { status: 400, message: 'Invalid Indian phone number format' };
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in Redis (10 mins TTL = 600s)
  await redisClient.setEx(`otp:${phone}`, 600, otp);

  // Send SMS via Twilio if configured, else just log it
  const messageBody = `Your GigShield OTP is ${otp}. Valid for 10 minutes.`;
  
  if (twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body: messageBody,
        from: TWILIO_PHONE,
        to: phone.startsWith('+91') ? phone : `+91${phone}`
      });
    } catch (err) {
      console.error('[AuthService] Twilio error:', err.message);
      // Fallback for dev environment without active Twilio plans
      console.log(`[AuthService] Fallback OTP for ${phone}: ${otp}`);
    }
  } else {
    // Development mode
    console.log(`[AuthService] Dev OTP for ${phone}: ${otp}`);
  }

  return { success: true, expiresIn: 600 };
};

const verifyOtp = async (phone, otp) => {
  const cachedOtp = await redisClient.get(`otp:${phone}`);
  
  if (!cachedOtp) {
    throw { status: 400, message: 'OTP expired or not requested' };
  }
  
  if (cachedOtp !== otp) {
    throw { status: 400, message: 'Invalid OTP' };
  }
  
  // OTP verified, clear from Redis
  await redisClient.del(`otp:${phone}`);

  // Upsert user in DB
  let user;
  let isNewUser = false;
  
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  
  if (rows.length === 0) {
    isNewUser = true;
    const { rows: newRows } = await pool.query(
      'INSERT INTO users (phone, created_at, role) VALUES ($1, NOW(), $2) RETURNING *',
      [phone, 'worker']
    );
    user = newRows[0];
  } else {
    user = rows[0];
  }

  // Issue JWT
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Store Session in Redis (7 days = 604800s)
  const sessionData = JSON.stringify({ token, last_seen: new Date() });
  await redisClient.setEx(`session:${user.id}`, 604800, sessionData);

  // session stored in Redis above; no updated_at column in schema

  return { token, isNewUser, userId: user.id };
};

const mockAadhaarVerify = async (userId, aadhaarNumber) => {
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    throw { status: 400, message: 'Invalid Aadhaar format. Must be 12 digits.' };
  }

  // Mock validation: starts with '9' is valid, else failed
  const isVerified = aadhaarNumber.startsWith('9');
  const status = isVerified ? 'verified' : 'failed';
  
  const { rowCount } = await pool.query(
    'UPDATE users SET aadhaar_status = $1 WHERE id = $2',
    [status, userId]
  );
  
  if (rowCount === 0) {
    throw { status: 404, message: 'User not found' };
  }

  const maskedAadhaar = `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;
  return { verified: isVerified, maskedAadhaar };
};

const linkPlatform = async (userId, platformType, platformId) => {
  const allowedPlatforms = ['zomato', 'swiggy', 'zepto', 'blinkit', 'amazon'];
  if (!allowedPlatforms.includes(platformType.toLowerCase())) {
    throw { status: 400, message: 'Invalid platform type' };
  }

  const { rowCount } = await pool.query(
    'UPDATE users SET platform_type = $1, platform_id = $2 WHERE id = $3',
    [platformType.toLowerCase(), platformId, userId]
  );
  
  if (rowCount === 0) {
    throw { status: 404, message: 'User not found' };
  }

  return { linked: true, platform: platformType.toLowerCase() };
};

const refreshToken = async (userId) => {
  const { rows } = await pool.query('SELECT id, phone, role FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) throw { status: 404, message: 'User not found' };
  
  const user = rows[0];
  
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const sessionData = JSON.stringify({ token, last_seen: new Date() });
  await redisClient.setEx(`session:${user.id}`, 604800, sessionData);

  return { token };
};

module.exports = {
  sendOtp,
  verifyOtp,
  mockAadhaarVerify,
  linkPlatform,
  refreshToken
};
