const express = require('express');
const router = express.Router();
const rawMaterialReceiptController = require('../controllers/rawMaterialReceiptController');

router.get('/pending', rawMaterialReceiptController.getPendingReceipts);
router.get('/history', rawMaterialReceiptController.getReceiptHistory);
router.post('/', rawMaterialReceiptController.createReceipt);

module.exports = router;
