const express = require('express');
const router = express.Router();
const dispatchPlanningController = require('../controllers/dispatchPlanningController');

router.get('/pending', dispatchPlanningController.getPendingDispatches);

module.exports = router;
