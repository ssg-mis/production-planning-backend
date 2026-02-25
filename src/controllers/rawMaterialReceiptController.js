const rawMaterialReceiptService = require('../services/rawMaterialReceiptService');

/**
 * Controller for Raw Material Receipt operations
 */

const getPendingReceipts = async (req, res, next) => {
    try {
        const pending = await rawMaterialReceiptService.getPendingRawMaterialReceipts();
        res.status(200).json({
            status: 'success',
            data: pending
        });
    } catch (error) {
        console.error('Error in getPendingReceipts controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch pending receipts' });
    }
};

const getReceiptHistory = async (req, res, next) => {
    try {
        const history = await rawMaterialReceiptService.getRawMaterialReceiptHistory();
        res.status(200).json({
            status: 'success',
            data: history
        });
    } catch (error) {
        console.error('Error in getReceiptHistory controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch receipt history' });
    }
};

const createReceipt = async (req, res, next) => {
    try {
        const result = await rawMaterialReceiptService.createRawMaterialReceipt(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Raw material receipt recorded successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in createReceipt controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create raw material receipt' });
    }
};

module.exports = {
    getPendingReceipts,
    getReceiptHistory,
    createReceipt
};
