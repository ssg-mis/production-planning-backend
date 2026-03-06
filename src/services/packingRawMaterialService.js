const { prisma, dispatchPrisma } = require('../config/db');

/**
 * Fetch BOM items from the order-to-dispatch DB for a given product name (skuname)
 * Uses raw SQL since the bom table is not in the production-planning Prisma schema
 */
const getBOMForProduct = async (productName) => {
  try {
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
  const indentedSums = await prisma.packingRawMaterialIndent.groupBy({
    by: ['production_id'],
    _sum: {
      oil_qty: true
    }
  });

  const indentedQtyMap = {};
  indentedSums.forEach(group => {
    indentedQtyMap[group.production_id] = Number(group._sum.oil_qty || 0);
  });

  // 3. Fetch production indent details for received IDs
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: receivedIds } },
    orderBy: { created_at: 'desc' }
  });

  // 4. Fetch BOM for unique SKUs
  const uniqueProductNames = [...new Set(indents.flatMap(i =>
    i.product_name.split(',').map(s => s.trim()).filter(Boolean)
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
      const skuNames = item.product_name.split(',').map(s => s.trim()).filter(Boolean);
      
      const totalReceivedQty = Number(receipt ? receipt.received_qty : 0);
      const totalReceivedKg = totalReceivedQty; // User confirmed received_qty is in Kg
      
      const alreadyIndentedQty = indentedQtyMap[item.production_id] || 0;
      
      // Calculate remaining balance
      // If we indented 50 out of 100 received, balance is 50.
      const balanceQty = Math.max(0, totalReceivedQty - alreadyIndentedQty);
      const balanceKg = totalReceivedQty > 0 ? (balanceQty / totalReceivedQty) * totalReceivedKg : 0;

      return {
        ...item,
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
  const history = await prisma.packingRawMaterialIndent.findMany({
    include: {
      bom_items: true
    },
    orderBy: { created_at: 'desc' }
  });

  const productionIds = history.map(h => h.production_id);
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: productionIds } }
  });

  return history.map(h => {
    const indent = indents.find(i => i.production_id === h.production_id);
    return { ...h, indentDetails: indent || null };
  });
};

/**
 * Create packing raw material indent record
 */
const createPackingIndent = async (data) => {
  const { productionId, bomItems, oilQty } = data;
  const fs = require('fs');

  try {
    const result = await prisma.packingRawMaterialIndent.create({
      data: {
        production_id: productionId,
        oil_qty: Number(oilQty || 0),
        status: 'Allocated',
        bom_items: {
          create: bomItems.map(item => ({
            production_id: productionId,
            item_name: item.itemName,
            qty_required: Number(item.qtyRequired),
            qty_allocated: Number(item.qtyAllocated || item.qtyRequired)
          }))
        }
      },
      include: {
        bom_items: true
      }
    });

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
};
