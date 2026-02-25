const dispatchPlantService = require('../services/dispatchPlantService');

const getPendingDispatchPlant = async (req, res) => {
  try {
    const data = await dispatchPlantService.getPendingDispatchPlant();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getPendingDispatchPlant:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getDispatchPlantHistory = async (req, res) => {
  try {
    const data = await dispatchPlantService.getDispatchPlantHistory();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error in getDispatchPlantHistory:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const createDispatchPlanningPlant = async (req, res) => {
  try {
    const result = await dispatchPlantService.createDispatchPlanningPlant(req.body);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error in createDispatchPlanningPlant:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getPendingDispatchPlant,
  getDispatchPlantHistory,
  createDispatchPlanningPlant,
};
