const express = require('express');
const { requireAdmin } = require('../middleware/adminMiddleware');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All routes require Admin privileges
router.use(requireAdmin);

/**
 * @route GET /api/analytics
 */
router.get('/', asyncHandler(async (req, res) => {
  const metrics = await analyticsService.getDashboardMetrics();
  res.json({ success: true, ...metrics });
}));

/**
 * @route GET /api/analytics/triggers
 */
router.get('/triggers', asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 30;
  const data = await analyticsService.getTriggerFrequency(days);
  res.json({ success: true, data });
}));

/**
 * @route GET /api/analytics/claims-vs-premiums
 */
router.get('/claims-vs-premiums', asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 30;
  const data = await analyticsService.getClaimsVsPremiums(days);
  res.json({ success: true, data });
}));

/**
 * @route GET /api/analytics/plans
 */
router.get('/plans', asyncHandler(async (req, res) => {
  const data = await analyticsService.getPlanDistribution();
  res.json({ success: true, data });
}));

/**
 * @route GET /api/analytics/fraud/stats
 */
router.get('/fraud/stats', asyncHandler(async (req, res) => {
  const data = await analyticsService.getFraudStats();
  res.json({ success: true, ...data });
}));

/**
 * @route GET /api/analytics/forecast
 */
router.get('/forecast', asyncHandler(async (req, res) => {
  const data = await analyticsService.getForecast();
  res.json({ success: true, data });
}));

module.exports = router;
