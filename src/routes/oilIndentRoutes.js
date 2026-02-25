const express = require('express');
const router = express.Router();
const { getPendingOilIndents } = require('../controllers/oilIndentController');

// Get pending oil indents
router.get('/pending', getPendingOilIndents);

module.exports = router;
