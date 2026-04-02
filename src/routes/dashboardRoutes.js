const express = require('express');
const {
  getDashboardStats,
  getBalanceTrend,
  getSpendingBreakdown,
  getInsights,
  testDashboard
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Test endpoint
router.get('/test', testDashboard);

// Dashboard endpoints
router.get('/stats', getDashboardStats);
router.get('/trend', getBalanceTrend);
router.get('/spending-breakdown', getSpendingBreakdown);
router.get('/insights', getInsights);

module.exports = router;