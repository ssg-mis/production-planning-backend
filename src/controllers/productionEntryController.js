const productionEntryService = require('../services/productionEntryService');

const getPendingEntries = async (req, res) => {
    try {
        const data = await productionEntryService.getPendingProductionEntries();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error in getPendingEntries controller:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getEntryHistory = async (req, res) => {
    try {
        const data = await productionEntryService.getProductionEntryHistory();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error in getEntryHistory controller:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const createEntry = async (req, res) => {
    try {
        const data = await productionEntryService.createProductionEntry(req.body);
        res.status(201).json({ status: 'success', data });
    } catch (error) {
        console.error('Error in createEntry controller:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getPendingEntries,
    getEntryHistory,
    createEntry
};
