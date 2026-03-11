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

// Debug route to add column
router.get('/fix-db', async (req, res) => {
  try {
    const { prisma } = require('../config/db');
    await prisma.$executeRawUnsafe(`ALTER TABLE packing_raw_material_indent ADD COLUMN IF NOT EXISTS selected_skus JSONB;`);
    res.json({ status: 'success', message: 'Column selected_skus added successfully' });
  } catch (error) {
    console.error('Error fixing DB:', error);
    res.status(500).json({ status: 'error', message: error.message });
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
    // Log incoming data for debugging
    console.log('[PackingIndent] Creating indent for:', req.body.productionId,
      '| oilQty:', req.body.oilQty,
      '| bomItems:', req.body.bomItems?.length || 0);

    const result = await packingRawMaterialService.createPackingIndent(req.body);
    res.json(result);
  } catch (error) {
    console.error('[PackingIndent] Error creating packing indent:', error.message);
    console.error('[PackingIndent] Payload was:', JSON.stringify(req.body));
    
    // Handle duplicate production_id (unique constraint violation)
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return res.status(409).json({ error: `Indent for ${req.body.productionId} already exists` });
    }
    res.status(500).json({ error: 'Failed to create packing indent', details: error.message });
  }
});

// Fetch SKUs by oil type
router.get('/skus', async (req, res) => {
  try {
    const { oilType } = req.query;
    if (!oilType) return res.status(400).json({ error: 'oilType is required' });
    const skus = await packingRawMaterialService.getSKUsByOilType(oilType);
    res.json(skus);
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ error: 'Failed to fetch SKUs' });
  }
});

// Fetch BOM for a specific SKU
router.get('/bom', async (req, res) => {
  try {
    const { skuName } = req.query;
    if (!skuName) return res.status(400).json({ error: 'skuName is required' });
    const bom = await packingRawMaterialService.getBOMForProduct(skuName);
    res.json(bom);
  } catch (error) {
    console.error('Error fetching BOM:', error);
    res.status(500).json({ error: 'Failed to fetch BOM' });
  }
});

module.exports = router;
