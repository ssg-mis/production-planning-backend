const oilReceiptService = require('../services/oilReceiptService');

const getPendingOilReceipts = async (req, res) => {
  try {
    const data = await oilReceiptService.getPendingOilReceipts();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getPendingOilReceipts:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getOilReceiptHistory = async (req, res) => {
  try {
    const data = await oilReceiptService.getOilReceiptHistory();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getOilReceiptHistory:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const createOilReceipt = async (req, res) => {
  try {
    const result = await oilReceiptService.createOilReceipt(req.body);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error in createOilReceipt:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getPendingOilReceipts,
  getOilReceiptHistory,
  createOilReceipt,
};
