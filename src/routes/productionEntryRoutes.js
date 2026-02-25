const express = require('express');
const router = express.Router();
const productionEntryController = require('../controllers/productionEntryController');

router.get('/pending', productionEntryController.getPendingEntries);
router.get('/history', productionEntryController.getEntryHistory);
router.post('/', productionEntryController.createEntry);

module.exports = router;
