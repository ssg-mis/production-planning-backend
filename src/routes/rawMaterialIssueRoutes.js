const express = require('express');
const router = express.Router();
const rawMaterialIssueController = require('../controllers/rawMaterialIssueController');

router.get('/pending', rawMaterialIssueController.getPendingIssues);
router.get('/history', rawMaterialIssueController.getIssueHistory);
router.post('/', rawMaterialIssueController.createIssue);

module.exports = router;
