const express = require('express');
const router = express.Router();
const indentApprovalController = require('../controllers/indentApprovalController');

// Routes
router.get('/pending', indentApprovalController.getPendingApprovals);
router.get('/history', indentApprovalController.getApprovalHistory);
router.post('/', indentApprovalController.createApproval);

module.exports = router;
