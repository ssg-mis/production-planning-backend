const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dispatchPlantController');

router.get('/pending', ctrl.getPendingDispatchPlant);
router.get('/history', ctrl.getDispatchPlantHistory);
router.post('/', ctrl.createDispatchPlanningPlant);

module.exports = router;
