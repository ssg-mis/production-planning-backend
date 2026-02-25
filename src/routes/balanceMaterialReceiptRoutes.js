const express = require('express');
const router = express.Router();
const balanceMaterialReceiptController = require('../controllers/balanceMaterialReceiptController');

router.get('/pending', balanceMaterialReceiptController.getPending);
router.get('/history', balanceMaterialReceiptController.getHistory);
router.post('/', balanceMaterialReceiptController.create);

module.exports = router;
