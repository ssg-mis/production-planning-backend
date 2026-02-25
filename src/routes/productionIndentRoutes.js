const express = require('express');
const router = express.Router();
const { createProductionIndent, getProductionIndents } = require('../controllers/productionIndentController');

// Create new production indent
router.post('/', createProductionIndent);

// Get all production indents
router.get('/', getProductionIndents);

module.exports = router;
