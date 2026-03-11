const { prisma, dispatchPrisma } = require('../config/db');

/**
 * Fetch BOM items from the order-to-dispatch DB for a given product name (skuname)
 * Uses raw SQL since the bom table is not in the production-planning Prisma schema
 */
const getBOMForProduct = async (productName) => {
  try {
    if (!dispatchPrisma) {
      console.warn('Dispatch database connection not available. Skipping BOM fetch.');
      return [];
    }
    const result = await dispatchPrisma.$queryRawUnsafe(
      `SELECT rmname, rmqty, rmunit, mainqty, mainuom FROM bom WHERE LOWER(TRIM(skuname)) = LOWER(TRIM($1)) ORDER BY id`,
      productName
    );
    return result.map(row => ({
      rmname: row.rmname,
      rmqty: row.rmqty,
      rmunit: row.rmunit,
      mainqty: row.mainqty,
      mainuom: row.mainuom,
    }));
  } catch (err) {
    console.error('Error fetching BOM for product:', productName, err.message);
    return [];
  }
};

/**
 * Fetch SKUs from the order-to-dispatch DB for a given oil type
 */
const getSKUsByOilType = async (oilType) => {
  try {
    let keyword = '';
    const lowerType = oilType.toLowerCase();
    
    if (lowerType.includes('soybean') || lowerType.includes('soya')) keyword = 'SBO';
    else if (lowerType.includes('rice bran') || lowerType.includes('rbo')) keyword = 'RBO';
    else if (lowerType.includes('palm')) keyword = 'PALM';
    
    if (!keyword) return [];

    if (!dispatchPrisma) {
      console.warn('Dispatch database connection not available. Skipping SKU fetch.');
      return [];
    }
    const result = await dispatchPrisma.$queryRawUnsafe(
      `SELECT DISTINCT sku_name FROM sku_details WHERE sku_name ILIKE $1 AND status = 'Active' ORDER BY sku_name`,
      `%${keyword}%`
    );
    return result.map(row => row.sku_name);
  } catch (err) {
    console.error('Error fetching SKUs for oil type:', oilType, err.message);
    return [];
  }
};

/**
 * Get pending packing raw material indents:
 * Items in oil_receipt NOT yet in packing_raw_material_indent
 * Also fetches BOM from the dispatch DB for each product
 */
const getPendingPackingIndents = async () => {
  // 1. Get all received items (oil_receipt)
  const allReceived = await prisma.oilReceipt.findMany({
    select: { 
      production_id: true, 
      received_qty: true
    }
  });
  if (allReceived.length === 0) return [];

  const receivedIds = allReceived.map(r => r.production_id);

  // 2. Get sum of already indented quantities per production_id
  let indentedSums = [];
  try {
    indentedSums = await prisma.packingRawMaterialIndent.groupBy({
      by: ['production_id'],
      _sum: {
        oil_qty: true
      }
    });
  } catch (err) {
    console.error('Error grouping indents (missing oil_qty?):', err.message);
    // Try raw SQL as fallback
    try {
        indentedSums = await prisma.$queryRawUnsafe(`
            SELECT production_id, SUM(oil_qty) as "_sum_oil_qty" 
            FROM packing_raw_material_indent 
            GROUP BY production_id
        `);
        // Map raw SQL format to Prisma format
        indentedSums = indentedSums.map(s => ({
            production_id: s.production_id,
            _sum: { oil_qty: s._sum_oil_qty }
        }));
    } catch (rawErr) {
        console.error('Raw fallback failed too:', rawErr.message);
    }
  }

  const indentedQtyMap = {};
  indentedSums.forEach(group => {
    indentedQtyMap[group.production_id] = Number(group._sum?.oil_qty || 0);
  });

  // 3. Fetch production indent details for received IDs
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: receivedIds } },
    orderBy: { created_at: 'desc' }
  });

  // 3.5 Fetch given_from_tank_no from indentApproval
  const approvals = await prisma.indentApproval.findMany({
    where: { production_id: { in: receivedIds } },
    select: { production_id: true, given_from_tank_no: true }
  });

  // 4. Fetch BOM for unique SKUs
  const uniqueProductNames = [...new Set(indents.flatMap(i =>
    (i.product_name || '').split(',').map(s => s.trim()).filter(Boolean)
  ))];
  const bomByProduct = {};
  await Promise.all(uniqueProductNames.map(async (name) => {
    bomByProduct[name] = await getBOMForProduct(name);
  }));

  // 5. Attach BOM and calculate remaining balance
  // Filter for indents that still have an oil balance left to pack
  return indents
    .map(item => {
      const receipt = allReceived.find(r => r.production_id === item.production_id);
      const approval = approvals.find(a => a.production_id === item.production_id);
      const skuNames = (item.product_name || '').split(',').map(s => s.trim()).filter(Boolean);
      
      const totalReceivedQty = Number(receipt ? receipt.received_qty : 0);
      const totalReceivedKg = totalReceivedQty;
      
      const alreadyIndentedQty = indentedQtyMap[item.production_id] || 0;
      
      const balanceQty = Math.max(0, totalReceivedQty - alreadyIndentedQty);
      const balanceKg = totalReceivedQty > 0 ? (balanceQty / totalReceivedQty) * totalReceivedKg : 0;

      return {
        ...item,
        given_from_tank_no: approval ? approval.given_from_tank_no : null,
        actual_dispatch_qty: item.indent_quantity,
        actual_dispatch_kg: item.total_weight_kg,
        total_received_qty: totalReceivedQty,
        total_received_kg: totalReceivedKg,
        balance_qty: balanceQty,
        balance_kg: balanceKg,
        bom: skuNames.flatMap(n => bomByProduct[n] || []),
        sku_boms: skuNames.map(skuName => ({ skuName, bom: bomByProduct[skuName] || [] }))
      };
    })
    .filter(item => item.balance_qty > 0.01); // Filter out completed ones
};

/**
 * Get packing raw material indent history
 */
const getPackingIndentHistory = async () => {
  try {
    const history = await prisma.$queryRawUnsafe(`
      SELECT * FROM packing_raw_material_indent ORDER BY created_at DESC
    `);

    const productionIds = (history || []).map(h => h.production_id);
    const indents = await prisma.productionIndent.findMany({
      where: { production_id: { in: productionIds } }
    });

    // Fetch BOM items via Prisma (this table is stable)
    const bomItems = await prisma.packingRawMaterialBOM.findMany({
      where: { production_id: { in: productionIds } }
    });

    return (history || []).map(h => {
      const indent = indents.find(i => i.production_id === h.production_id);
      const items = bomItems.filter(b => b.production_id === h.production_id);
      return { 
        ...h, 
        indentDetails: indent || null,
        bom_items: items,
        selected_skus: h.selected_skus || []
      };
    });
  } catch (err) {
    console.error('Error fetching packing indent history:', err.message);
    return [];
  }
};

/**
 * Create packing raw material indent record
 */
const createPackingIndent = async (data) => {
  const { productionId, bomItems, oilQty } = data;
  const fs = require('fs');

  try {
    // Round values to 2 decimal places to prevent Decimal(10,2) overflow
    const roundedOilQty = Math.round((Number(oilQty || 0)) * 100) / 100;

    const validBomItems = (bomItems || []).filter(item => item.itemName && item.itemName.trim() !== '');

    const result = await prisma.packingRawMaterialIndent.create({
      data: {
        production_id: productionId,
        // oil_qty: roundedOilQty, // Commented out to avoid Prisma sync error
        // selected_skus: data.selectedSkus || [], // Commented out to avoid Prisma sync error
        status: 'Allocated',
        bom_items: {
          create: validBomItems.map(item => ({
            production_id: productionId,
            item_name: item.itemName,
            qty_required: Math.round((Number(item.qtyRequired) || 0) * 100) / 100,
            qty_allocated: Math.round((Number(item.qtyAllocated || item.qtyRequired) || 0) * 100) / 100,
          }))
        }
      },
      include: {
        bom_items: true
      }
    });

    // Update new columns using raw SQL to bypass Prisma schema sync issues
    try {
      const skusJson = JSON.stringify(data.selectedSkus || []);
      await prisma.$executeRawUnsafe(
        `UPDATE packing_raw_material_indent SET selected_skus = $1::jsonb, oil_qty = $2 WHERE id = $3`,
        skusJson,
        roundedOilQty,
        result.id
      );
    } catch (updateError) {
      console.warn('Warning: Could not update new columns via raw SQL:', updateError.message);
    }

    return result;
  } catch (error) {
    fs.appendFileSync('backend_error.log', `Error creating packing indent: ${error.message}\n`);
    throw error;
  }
};

module.exports = {
  getPendingPackingIndents,
  getPackingIndentHistory,
  createPackingIndent,
  getBOMForProduct,
  getSKUsByOilType,
};
