const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../services/dashboardService');

router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    // Handle BigInt serialization
    res.json(JSON.parse(JSON.stringify(stats, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )));
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
