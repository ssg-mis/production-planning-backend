const stockInService = require('../services/stockInService');

/**
 * Get pending stock items
 */
const getPending = async (req, res) => {
    try {
        const pending = await stockInService.getPendingStockIn();
        res.status(200).json(pending);
    } catch (error) {
        console.error('Error fetching pending stock items:', error);
        res.status(500).json({ error: 'Failed to fetch pending stock items' });
    }
};

/**
 * Get stock in history
 */
const getHistory = async (req, res) => {
    try {
        const history = await stockInService.getStockInHistory();
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching stock in history:', error);
        res.status(500).json({ error: 'Failed to fetch stock in history' });
    }
};

/**
 * Create stock in record
 */
const create = async (req, res) => {
    try {
        const record = await stockInService.createStockIn(req.body);
        res.status(201).json(record);
    } catch (error) {
        console.error('Error creating stock in record:', error);
        res.status(500).json({ error: 'Failed to create stock in record' });
    }
};

/**
 * Bulk create stock in records
 */
const bulkCreate = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid items array' });
        }
        const records = await stockInService.bulkCreateStockIn(items);
        res.status(201).json(records);
    } catch (error) {
        console.error('Error in bulk stock in creation:', error);
        res.status(500).json({ error: 'Failed to process bulk stock in' });
    }
};

module.exports = {
    getPending,
    getHistory,
    create,
    bulkCreate
};
