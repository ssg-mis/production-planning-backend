const express = require('express');
const router = express.Router();
const master = require('../controllers/masterController');

/* ──── Raw Material ──── */
router.get('/raw-material',           master.getRawMaterials);
router.post('/raw-material',          master.createRawMaterial);
router.put('/raw-material/:id',       master.updateRawMaterial);
router.delete('/raw-material/:id',    master.deleteRawMaterial);

/* ──── BOM ──── */
router.get('/bom',                    master.getBOM);
router.post('/bom',                   master.createBOM);
router.put('/bom/:id',                master.updateBOM);
router.delete('/bom/:id',             master.deleteBOM);

/* ──── Lab Report Master ──── */
router.get('/lab-report-master',          master.getLabReportMaster);
router.post('/lab-report-master',         master.createLabReportMaster);
router.put('/lab-report-master/:id',      master.updateLabReportMaster);
router.delete('/lab-report-master/:id',   master.deleteLabReportMaster);

/* ──── Chemical Additives ──── */
router.get('/chemical-additives',         master.getChemicalAdditives);
router.post('/chemical-additives',        master.createChemicalAdditive);
router.put('/chemical-additives/:id',     master.updateChemicalAdditive);
router.delete('/chemical-additives/:id',  master.deleteChemicalAdditive);

/* ──── Tanker Master ──── */
router.get('/tanker-master',          master.getTankerMaster);
router.post('/tanker-master',         master.createTankerMaster);
router.put('/tanker-master/:id',      master.updateTankerMaster);
router.delete('/tanker-master/:id',   master.deleteTankerMaster);

module.exports = router;
