const express = require('express');
const router = express.Router();
const labConfirmationController = require('../controllers/labConfirmationController');

router.get('/pending', labConfirmationController.getPending);
router.get('/history', labConfirmationController.getHistory);
router.post('/', labConfirmationController.create);

module.exports = router;
