const indentApprovalService = require('../services/indentApprovalService');

// Get Pending Approvals
const getPendingApprovals = async (req, res) => {
  try {
    const data = await indentApprovalService.getPendingApprovals();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getPendingApprovals:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get Approval History
const getApprovalHistory = async (req, res) => {
  try {
    const data = await indentApprovalService.getApprovalHistory();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getApprovalHistory:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create Approval
const createApproval = async (req, res) => {
  try {
    const result = await indentApprovalService.createApproval(req.body);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error in createApproval:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getPendingApprovals,
  getApprovalHistory,
  createApproval
};
