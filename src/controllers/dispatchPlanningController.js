const dispatchPlanningService = require('../services/dispatchPlanningService');

/**
 * Controller for Dispatch Planning operations
 * Handles HTTP requests/responses for dispatch planning endpoints
 */

/**
 * Get pending dispatch orders
 * @route GET /api/v1/dispatch-planning/pending
 */
const getPendingDispatches = async (req, res, next) => {
  try {
    // Fetch data from service layer
    const pendingDispatches = await dispatchPlanningService.getPendingDispatches();
    
    // Transform and serialize data
    const transformedData = dispatchPlanningService.transformDispatchData(pendingDispatches);
    const serializedData = dispatchPlanningService.serializeData(transformedData);

    res.status(200).json({
      success: true,
      count: serializedData.length,
      data: serializedData
    });
  } catch (error) {
    console.error('Error in getPendingDispatches controller:', error);
    
    // Handle specific error types
    if (error.message === 'Dispatch database connection not available') {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Dispatch database connection is not available'
      });
    }
    
    // Pass to error handling middleware
    next(error);
  }
};

module.exports = {
  getPendingDispatches,
};
