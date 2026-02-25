const { dispatchPrisma, prisma } = require('../config/db');

/**
 * Service layer for Oil Indent operations
 * Handles all business logic for oil indents
 */

/**
 * Fetch pending oil indents from database
 * @returns {Promise<Array>} Array of pending oil indent records
 */
const getPendingIndents = async () => {
  if (!dispatchPrisma || !prisma) {
    throw new Error('Database connection not available');
  }

  // 1. Get list of already submitted order IDs from production_indent (Main DB)
  const submittedIndents = await prisma.productionIndent.findMany({
    select: {
      order_id: true
    }
  });

  const submittedOrderIds = submittedIndents
    .map(indent => indent.order_id)
    .filter(id => id); // Filter out nulls if any

  // 2. Query lift_receiving_confirmation (Dispatch DB)
  // Since we can't join across databases, we'll fetch pending items
  // and filter them, or use NOT IN if list isn't too large.
  // Using queryRaw with NOT IN clause for efficiency if supported, 
  // or fetching and filtering in application layer.
  // Given potential SQL injection risks with manual string construction for IN clause,
  // and Prisma queryRaw limitations with arrays in some versions,
  // let's try passing the array if possible, or fetch filtered set.
  
  let query = `
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
  `;
  
  if (submittedOrderIds.length > 0) {
     // Prepare properly formatted string for SQL IN clause
     // ensuring we escape single quotes if necessary, though IDs are usually safe chars
     // equivalent to: AND so_no NOT IN ('ID1', 'ID2')
     const idsList = submittedOrderIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
     query += ` AND so_no NOT IN (${idsList})`;
  }
  
  query += ` ORDER BY planned_1 DESC`;

  const pendingIndents = await dispatchPrisma.$queryRawUnsafe(query);

  return pendingIndents;
};

/**
 * Transform raw database records to API response format
 * @param {Array} records - Raw database records
 * @returns {Array} Transformed records
 */
const transformIndentData = (records) => {
  return records.map(record => ({
    orderNo: record.so_no,
    partyName: record.party_name,
    productName: record.product_name,
    quantity: record.qty_to_be_dispatched ? parseFloat(record.qty_to_be_dispatched) : 0,
    transportType: record.type_of_transporting,
    dispatchFrom: record.dispatch_from,
    plannedDate: record.planned_1,
    actualDate: record.actual_1,
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
  getPendingIndents,
  transformIndentData,
  serializeData
};
