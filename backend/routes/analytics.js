const express = require('express');
const router = express.Router();
const { getDashboardAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All analytics routes are protected and admin-only
router.use(protect);
router.use(authorize('admin'));

// Analytics routes
router.get('/dashboard', getDashboardAnalytics);

module.exports = router;
