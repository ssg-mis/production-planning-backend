const balanceMaterialReceiptService = require('../services/balanceMaterialReceiptService');

/**
 * Get pending balance receipts
 */
const getPending = async (req, res) => {
    try {
        const pending = await balanceMaterialReceiptService.getPendingBalanceReceipts();
        res.status(200).json(pending);
    } catch (error) {
        console.error('Error fetching pending balance receipts:', error);
        res.status(500).json({ error: 'Failed to fetch pending balance receipts' });
    }
};

/**
 * Get balance receipt history
 */
const getHistory = async (req, res) => {
    try {
        const history = await balanceMaterialReceiptService.getBalanceReceiptHistory();
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching balance receipt history:', error);
        res.status(500).json({ error: 'Failed to fetch balance receipt history' });
    }
};

/**
 * Create balance receipt
 */
const create = async (req, res) => {
    try {
        const receipt = await balanceMaterialReceiptService.createBalanceReceipt(req.body);
        res.status(201).json(receipt);
    } catch (error) {
        console.error('Error creating balance receipt:', error);
        res.status(500).json({ error: 'Failed to create balance receipt' });
    }
};

module.exports = {
    getPending,
    getHistory,
    create
};
