const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');
const { otpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Helper to catch async errors and pass to global error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    
    res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: errors.array()
    });
  };
};

/**
 * @desc Send 6-digit OTP to a valid Indian phone number
 * @route POST /api/auth/send-otp
 */
router.post('/send-otp', 
  otpLimiter,
  validate([
    body('phone').trim().notEmpty().withMessage('Phone is required')
      .matches(/^(?:\+91[-. ]?)?[6789]\d{9}$/).withMessage('Must be a valid Indian phone number')
  ]),
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await authService.sendOtp(phone);
    res.json(result);
  })
);

/**
 * @desc Verify OTP and authenticate user, returns JWT
 * @route POST /api/auth/verify-otp
 */
router.post('/verify-otp',
  validate([
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('otp').trim().notEmpty().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ]),
  asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await authService.verifyOtp(phone, otp);
    res.json(result);
  })
);

/**
 * @desc Mock Aadhaar verification (needs auth)
 * @route POST /api/auth/aadhaar-mock
 */
router.post('/aadhaar-mock',
  requireAuth,
  validate([
    body('aadhaarNumber').trim().notEmpty().matches(/^\d{12}$/).withMessage('Aadhaar must be exactly 12 digits')
  ]),
  asyncHandler(async (req, res) => {
    const { aadhaarNumber } = req.body;
    const result = await authService.mockAadhaarVerify(req.user.userId, aadhaarNumber);
    res.json(result);
  })
);

/**
 * @desc Link delivery platform (needs auth)
 * @route POST /api/auth/link-platform
 */
router.post('/link-platform',
  requireAuth,
  validate([
    body('platformType').isIn(['zomato', 'swiggy', 'zepto', 'blinkit', 'amazon'])
      .withMessage('Invalid platform type'),
    body('platformId').trim().notEmpty().withMessage('Platform ID is required')
  ]),
  asyncHandler(async (req, res) => {
    const { platformType, platformId } = req.body;
    const result = await authService.linkPlatform(req.user.userId, platformType, platformId);
    res.json(result);
  })
);

/**
 * @desc Refresh JWT session (needs active auth)
 * @route POST /api/auth/refresh-token
 */
router.post('/refresh-token',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.user.userId);
    res.json(result);
  })
);

module.exports = router;
