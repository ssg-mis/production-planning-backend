const labConfirmationService = require('../services/labConfirmationService');

const getPending = async (req, res) => {
  try {
    const data = await labConfirmationService.getPendingLabConfirmations();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getPendingLabConfirmations:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const data = await labConfirmationService.getLabHistory();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getLabHistory:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const result = await labConfirmationService.createLabConfirmation(req.body);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error in createLabConfirmation:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getPending,
  getHistory,
  create
};
