const oilIndentService = require('../services/oilIndentService');

/**
 * Controller for Oil Indent operations
 * Handles HTTP requests/responses for oil indent endpoints
 */

/**
 * Get pending oil indents
 * @route GET /api/v1/oil-indent/pending
 */
const getPendingOilIndents = async (req, res, next) => {
  try {
    // Fetch data from service layer
    const pendingIndents = await oilIndentService.getPendingIndents();
    
    // Transform and serialize data
    const transformedData = oilIndentService.transformIndentData(pendingIndents);
    const serializedData = oilIndentService.serializeData(transformedData);

    res.status(200).json({
      success: true,
      count: serializedData.length,
      data: serializedData
    });
  } catch (error) {
    console.error('Error in getPendingOilIndents controller:', error);
    
    // Handle specific error types
    if (error.message === 'Database connection not available') {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Database connection is not available'
      });
    }
    
    // Pass to error handling middleware
    next(error);
  }
};

module.exports = {
  getPendingOilIndents,
};
