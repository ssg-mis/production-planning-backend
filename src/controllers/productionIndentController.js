const productionIndentService = require('../services/productionIndentService');

/**
 * Controller for Production Indent operations
 * Handles HTTP requests/responses for production indent endpoints
 */

/**
 * Create new production indent
 * @route POST /api/v1/production-indent
 */
const createProductionIndent = async (req, res, next) => {
  try {
    const { 
      orderId, 
      productName, 
      packingSize,
      packingType,
      partyName, 
      oilRequired, 
      selectedOil, 
      indentQuantity,
      tankNo,
      totalWeightKg,
      remarks
    } = req.body;

    // Log the request body for debugging
    console.log('Received production indent data:', { orderId, productName, partyName, totalWeightKg, remarks });

    // Validate required fields
    if (!productName || !partyName) {
      console.warn('Validation Error: Missing productName or partyName', req.body);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Product name and party name are required'
      });
    }

    // Create production indent via service
    const result = await productionIndentService.createProductionIndent({
      orderId,
      productName,
      packingSize,
      packingType,
      partyName,
      oilRequired,
      selectedOil,
      indentQuantity,
      tankNo,
      totalWeightKg,
      remarks
    });

    res.status(201).json({
      success: true,
      message: 'Production indent created successfully',
      data: result
    });
  } catch (error) {
    console.error('CRITICAL ERROR in createProductionIndent controller:', error);
    // Print full stack trace
    if (error.stack) console.error(error.stack);
    
    if (error.message === 'Database connection not available') {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Database connection is not available'
      });
    }
    
    next(error);
  }
};

/**
 * Get all production indents
 * @route GET /api/v1/production-indent
 */
const getProductionIndents = async (req, res, next) => {
  try {
    const indents = await productionIndentService.getProductionIndents();
    const transformedData = productionIndentService.transformIndentData(indents);
    const serializedData = productionIndentService.serializeData(transformedData);

    res.status(200).json({
      success: true,
      count: serializedData.length,
      data: serializedData
    });
  } catch (error) {
    console.error('Error in getProductionIndents controller:', error);
    
    if (error.message === 'Database connection not available') {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Database connection is not available'
      });
    }
    
    next(error);
  }
};

module.exports = {
  createProductionIndent,
  getProductionIndents
};
