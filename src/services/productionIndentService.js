const { prisma } = require('../config/db');

/**
 * Service layer for Production Indent operations
 * Handles business logic for production indent submissions
 */

/**
 * Generate unique sequential production ID (PD-001, PD-002) using Counter table
 * Uses atomic upsert/update to guarantee uniqueness
 * @returns {Promise<string>} Next production ID
 */
const getNextProductionId = async () => {
  try {
    // Debug log to check if prisma.counter is available
    if (!prisma.counter) {
      console.error('CRITICAL ERROR: prisma.counter is undefined. Prisma Client might need regeneration.');
      throw new Error('Prisma Client incomplete');
    }

    // Atomically increment the counter for 'production_indent'
    // If it doesn't exist, start at 1
    const counter = await prisma.counter.upsert({
      where: { name: 'production_indent' },
      update: { value: { increment: 1 } },
      create: { name: 'production_indent', value: 1 },
    });

    // Format with leading zeros (PD-001, PD-002, etc.)
    return `PD-${String(counter.value).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating production ID:', error);
    throw new Error('Failed to generate production ID');
  }
};

/**
 * Create new production indent
 * @param {Object} data - Production indent data
 * @returns {Promise<Object>} Created production indent
 */
const createProductionIndent = async (data) => {
  if (!prisma) {
    throw new Error('Database connection not available');
  }

  // Generate next production ID safely using atomic counter
  const productionId = await getNextProductionId();

  // Insert into database using Prisma Client
  const result = await prisma.productionIndent.create({
    data: {
      production_id: productionId,
      order_id: data.orderId || null,
      product_name: data.productName,
      packing_size: data.packingSize || null,
      packing_type: data.packingType || null,
      party_name: data.partyName,
      oil_required: data.oilRequired,
      selected_oil: data.selectedOil || null,
      indent_quantity: data.indentQuantity,
      // Ensure it's a valid number, default to null if NaN or undefined
      total_weight_kg: (data.totalWeightKg !== undefined && data.totalWeightKg !== null && !isNaN(data.totalWeightKg)) 
        ? data.totalWeightKg 
        : null,
      tank_no: data.tankNo || null,
      status: data.status || 'Submitted'
    }
  });

  return result;
};

/**
 * Get all production indents
 * @returns {Promise<Array>} Array of production indents
 */
const getProductionIndents = async () => {
  if (!prisma) {
    throw new Error('Database connection not available');
  }

  const indents = await prisma.$queryRaw`
    SELECT * FROM production_indent 
    ORDER BY created_at DESC
  `;

  return indents;
};

/**
 * Transform data for API response
 * @param {Array} records - Raw database records
 * @returns {Array} Transformed records
 */
const transformIndentData = (records) => {
  return records.map(record => ({
    id: record.id,
    productionId: record.production_id,
    orderId: record.order_id,
    productName: record.product_name,
    packingSize: record.packing_size,
    packingType: record.packing_type,
    partyName: record.party_name,
    oilRequired: record.oil_required ? parseFloat(record.oil_required) : 0,
    selectedOil: record.selected_oil,
    indentQuantity: record.indent_quantity ? parseFloat(record.indent_quantity) : 0,
    totalWeightKg: record.total_weight_kg ? parseFloat(record.total_weight_kg) : 0,
    tankNo: record.tank_no,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at
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
  getNextProductionId,
  createProductionIndent,
  getProductionIndents,
  transformIndentData,
  serializeData
};
