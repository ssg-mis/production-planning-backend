const { dispatchPrisma } = require('../config/db');

/**
 * Service layer for Dispatch Planning operations
 * Handles all business logic for dispatch planning
 */

/**
 * Fetch pending dispatch orders from database
 * @returns {Promise<Array>} Array of pending dispatch records
 */
const getPendingDispatches = async () => {
  if (!dispatchPrisma) {
    throw new Error('Dispatch database connection not available');
  }

  const pendingDispatches = await dispatchPrisma.$queryRaw`
    SELECT 
      lrc.so_no,
      lrc.party_name,
      lrc.product_name,
      lrc.qty_to_be_dispatched,
      lrc.type_of_transporting,
      lrc.dispatch_from,
      lrc.planned_1,
      lrc.actual_1,
      sd.packing_weight
    FROM lift_receiving_confirmation lrc
    LEFT JOIN sku_details sd ON lrc.product_name = sd.sku_name
    WHERE lrc.planned_1 IS NOT NULL 
    AND lrc.actual_1 IS NULL
    ORDER BY lrc.planned_1 DESC
  `;

  return pendingDispatches;
};

/**
 * Transform raw database records to API response format
 * @param {Array} records - Raw database records
 * @returns {Array} Transformed records
 */
const transformDispatchData = (records) => {
  return records.map(record => ({
    id: record.so_no, // Use SO Number as ID since it's unique
    orderNo: record.so_no,
    customerName: record.party_name,
    productName: record.product_name,
    quantity: record.qty_to_be_dispatched,
    rate: 0, // Rate not available in lift_receiving_confirmation
    oilType: null, // Frontend categorizes this
    deliveryDate: record.planned_1,
    depoName: record.dispatch_from,
    transportType: record.type_of_transporting,
    planned3: record.planned_1, // Using planned_1 as the main date
    actual3: record.actual_1,
    packingWeight: record.packing_weight
  }));
};

/**
 * Serialize data for JSON response (handles BigInt)
 * @param {any} data - Data to serialize
 * @returns {any} Serialized data
 */
const serializeData = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

module.exports = {
  getPendingDispatches,
  transformDispatchData,
  serializeData
};
