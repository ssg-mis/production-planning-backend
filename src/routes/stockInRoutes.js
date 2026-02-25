const express = require('express');
const router = express.Router();
const stockInController = require('../controllers/stockInController');

router.get('/pending', stockInController.getPending);
router.get('/history', stockInController.getHistory);
router.post('/', stockInController.create);
router.post('/bulk', stockInController.bulkCreate);

module.exports = router;
