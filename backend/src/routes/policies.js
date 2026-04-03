const express = require('express');
const { body, validationResult } = require('express-validator');
const policyService = require('../services/policyService');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: errors.array() });
  };
};

/**
 * @desc Get available policy plans calculated by ML engine
 * @route GET /api/policies/plans
 */
router.get('/plans', requireAuth, asyncHandler(async (req, res) => {
  const plans = await policyService.getPlans(req.user.userId);
  res.json({ success: true, plans });
}));

/**
 * @desc Subscribe to a policy plan
 * @route POST /api/policies/subscribe
 */
router.post('/subscribe',
  requireAuth,
  validate([
    body('planType').isIn(['basic', 'pro', 'ultra']).withMessage('Invalid plan type'),
    body('upiHandle').optional().isString()
  ]),
  asyncHandler(async (req, res) => {
    const { planType, upiHandle } = req.body;
    const result = await policyService.subscribePlan(req.user.userId, planType, upiHandle);
    res.json({ success: true, ...result });
  })
);

/**
 * @desc Get currently active policy
 * @route GET /api/policies/active
 */
router.get('/active', requireAuth, asyncHandler(async (req, res) => {
  const policy = await policyService.getActivePolicy(req.user.userId);
  if (!policy) {
    return res.status(404).json({ error: true, message: 'No active policy found' });
  }
  res.json({ success: true, policy });
}));

/**
 * @desc Cancel active policy
 * @route POST /api/policies/cancel
 */
router.post('/cancel', requireAuth, asyncHandler(async (req, res) => {
  const result = await policyService.cancelPolicy(req.user.userId);
  res.json({ success: true, ...result });
}));

module.exports = router;
