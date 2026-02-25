const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const dispatchPlanningRoutes = require('./dispatchPlanningRoutes');
const oilIndentRoutes = require('./oilIndentRoutes');
const productionIndentRoutes = require('./productionIndentRoutes');
const indentApprovalRoutes = require('./indentApprovalRoutes');
const labConfirmationRoutes = require('./labConfirmationRoutes');

router.use('/users', userRoutes);
router.use('/auth', userRoutes); // /auth/login endpoint
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/dispatch-planning', dispatchPlanningRoutes);
router.use('/oil-indent', oilIndentRoutes);
router.use('/production-indent', productionIndentRoutes);
router.use('/indent-approval', indentApprovalRoutes);
router.use('/lab-confirmation', labConfirmationRoutes);
router.use('/dispatch-planning-plant', require('./dispatchPlantRoutes'));
router.use('/oil-receipt', require('./oilReceiptRoutes'));
router.use('/packing-raw-material', require('./packingRawMaterialRoutes'));
router.use('/raw-material-issue', require('./rawMaterialIssueRoutes'));
router.use('/raw-material-receipt', require('./rawMaterialReceiptRoutes'));
router.use('/production-entry', require('./productionEntryRoutes'));
router.use('/balance-material-receipt', require('./balanceMaterialReceiptRoutes'));
router.use('/stock-in', require('./stockInRoutes'));
router.use('/reports', require('./reportRoutes'));

module.exports = router;
