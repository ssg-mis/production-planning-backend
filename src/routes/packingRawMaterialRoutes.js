const express = require('express');
const router = express.Router();
const packingRawMaterialService = require('../services/packingRawMaterialService');

// Get pending packing raw material indents
router.get('/pending', async (req, res) => {
  try {
    const pending = await packingRawMaterialService.getPendingPackingIndents();
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending packing indents:', error);
    res.status(500).json({ error: 'Failed to fetch pending packing indents' });
  }
});

// Get packing raw material indent history
router.get('/history', async (req, res) => {
  try {
    const history = await packingRawMaterialService.getPackingIndentHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching packing indent history:', error);
    res.status(500).json({ error: 'Failed to fetch packing indent history' });
  }
});

// Create new packing raw material indent
router.post('/', async (req, res) => {
  try {
    const result = await packingRawMaterialService.createPackingIndent(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error creating packing indent:', error);
    res.status(500).json({ error: 'Failed to create packing indent' });
  }
});

module.exports = router;
