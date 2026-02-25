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
    select: { production_id: true, received_qty: true }
  });
  const receivedIds = allReceived.map(r => r.production_id);
  if (receivedIds.length === 0) return [];

  // 2. Get items already in packing_raw_material_indent
  const alreadyIndented = await prisma.packingRawMaterialIndent.findMany({
    select: { production_id: true }
  });
  const indentedIds = alreadyIndented.map(i => i.production_id);

  // 3. Pending = received but not yet indented for packing
  const pendingIds = receivedIds.filter(id => !indentedIds.includes(id));
  if (pendingIds.length === 0) return [];

  // 4. Fetch production indent details for these IDs
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: pendingIds } },
    orderBy: { created_at: 'desc' }
  });

  const dispatchPlans = await prisma.dispatchPlanningPlant.findMany({
    where: { production_id: { in: pendingIds } }
  });

  // 5. For each unique product_name, fetch BOM from dispatch DB
  const uniqueProductNames = [...new Set(indents.map(i => i.product_name))];
  const bomByProduct = {};
  await Promise.all(uniqueProductNames.map(async (name) => {
    bomByProduct[name] = await getBOMForProduct(name);
  }));

  // 6. Attach BOM and dispatch quantity to each indent item
  return indents.map(item => {
    const dPlan = dispatchPlans.find(d => d.production_id === item.production_id);
    const receipt = allReceived.find(r => r.production_id === item.production_id);
    return {
      ...item,
      tank_no: item.tank_no,
      given_from_tank_no: item.given_from_tank_no,
      actual_dispatch_qty: item.indent_quantity,
      actual_dispatch_kg: item.total_weight_kg,
      balance_qty: receipt ? receipt.received_qty : 0,
      bom: bomByProduct[item.product_name] || []
    };
  });
};

/**
 * Get packing raw material indent history:
 * Items that are in packing_raw_material_indent, joined with production indent details and BOM items
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

  const dispatchPlans = await prisma.dispatchPlanningPlant.findMany({
    where: { production_id: { in: productionIds } }
  });

  const allReceived = await prisma.oilReceipt.findMany({
    where: { production_id: { in: productionIds } },
    select: { production_id: true, received_qty: true }
  });

  return history.map(h => {
    const indent = indents.find(i => i.production_id === h.production_id);
    const dPlan = dispatchPlans.find(d => d.production_id === h.production_id);
    const receipt = allReceived.find(r => r.production_id === h.production_id);
    
    if (indent) {
      indent.actual_dispatch_qty = indent.indent_quantity;
      indent.actual_dispatch_kg = indent.total_weight_kg;
      indent.balance_qty = receipt ? receipt.received_qty : 0;
    }
    
    return { ...h, indentDetails: indent || null };
  });
};

/**
 * Create packing raw material indent record
 */
const createPackingIndent = async (data) => {
  const { productionId, bomItems } = data;
  const fs = require('fs');

  try {
    const result = await prisma.packingRawMaterialIndent.create({
      data: {
        production_id: productionId,
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
    fs.appendFileSync('backend_error.log', `Error at ${new Date().toISOString()}:\n${error.stack || error}\nData: ${JSON.stringify(data)}\n\n`);
    throw error;
  }
};

module.exports = {
  getPendingPackingIndents,
  getPackingIndentHistory,
  createPackingIndent,
};
