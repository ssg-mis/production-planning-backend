const express = require('express');
const router = express.Router();
const oilReceiptController = require('../controllers/oilReceiptController');

router.get('/pending', oilReceiptController.getPendingOilReceipts);
router.get('/history', oilReceiptController.getOilReceiptHistory);
router.post('/', oilReceiptController.createOilReceipt);

module.exports = router;
