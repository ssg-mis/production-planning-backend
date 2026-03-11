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
    // 1. Try Prisma first
    const counter = await prisma.counter.upsert({
      where: { name: 'production_indent' },
      update: { value: { increment: 1 } },
      create: { name: 'production_indent', value: 1 },
    });
    return `PD-${String(counter.value).padStart(3, '0')}`;
  } catch (error) {
    console.error('Prisma counter failed, trying raw SQL fallback:', error.message);
    try {
      // 2. Raw SQL fallback for counter
      await prisma.$executeRawUnsafe(`
        INSERT INTO counter (name, value) VALUES ('production_indent', 1)
        ON CONFLICT (name) DO UPDATE SET value = counter.value + 1
      `);
      const rawCounter = await prisma.$queryRawUnsafe(`SELECT value FROM counter WHERE name = 'production_indent'`);
      const value = rawCounter[0]?.value || 1;
      return `PD-${String(value).padStart(3, '0')}`;
    } catch (rawError) {
      console.error('CRITICAL: Raw SQL fallback for counter failed:', rawError.message);
      // 3. Last resort - use timestamp to avoid blocking
      const timestamp = Date.now().toString().slice(-3);
      return `PD-EXT-${timestamp}`;
    }
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

  const indentData = {
    production_id: productionId,
    order_id: data.orderId || null,
    product_name: data.productName,
    packing_size: data.packingSize || null,
    packing_type: data.packingType || null,
    party_name: data.partyName,
    oil_required: data.oilRequired ? parseFloat(Number(data.oilRequired).toFixed(2)) : null,
    selected_oil: data.selectedOil || null,
    indent_quantity: data.indentQuantity ? parseFloat(Number(data.indentQuantity).toFixed(2)) : null,
    total_weight_kg: (data.totalWeightKg !== undefined && data.totalWeightKg !== null && !isNaN(data.totalWeightKg)) 
      ? parseFloat(Number(data.totalWeightKg).toFixed(2)) 
      : null,
    tank_no: data.tankNo || null,
    status: data.status || 'Submitted',
    remarks: data.remarks || null
  };

  try {
    // 1. Try Prisma first
    return await prisma.productionIndent.create({
      data: indentData
    });
  } catch (error) {
    console.error('Prisma createProductionIndent failed, trying raw SQL fallback:', error.message);
    try {
      // 2. Raw SQL fallback
      const columns = Object.keys(indentData).join(', ');
      const values = Object.values(indentData).map(val => val === null ? 'NULL' : (typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val)).join(', ');
      
      await prisma.$executeRawUnsafe(`INSERT INTO production_indent (${columns}) VALUES (${values})`);
      
      // Fetch the created record
      const result = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id = '${productionId}'`);
      return result[0];
    } catch (rawError) {
      console.error('CRITICAL: Raw SQL fallback for createProductionIndent failed:', rawError.message);
      throw new Error(`Failed to create production indent even with fallback: ${rawError.message}`);
    }
  }
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
    remarks: record.remarks,
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
