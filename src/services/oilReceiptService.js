const { prisma } = require('../config/db');

/**
 * Get pending oil receipt items:
 * Items in dispatch_planning_plant NOT yet in oil_receipt
 */
const getPendingOilReceipts = async () => {
  // 1. Get all planned items
  const alreadyPlanned = await prisma.dispatchPlanningPlant.findMany({
    select: { production_id: true, actual_qty_kg: true, additives: true }
  });
  const plannedIds = alreadyPlanned.map(d => d.production_id);
  if (plannedIds.length === 0) return [];

  // 2. Get already received items
  const alreadyReceived = await prisma.oilReceipt.findMany({
    select: { production_id: true }
  });
  const receivedIds = alreadyReceived.map(r => r.production_id);

  // 3. Pending = planned but not yet received
  const pendingIds = plannedIds.filter(id => !receivedIds.includes(id));
  if (pendingIds.length === 0) return [];

  // 3.5 Get approved quantities and tank numbers
  const approvals = await prisma.indentApproval.findMany({
    where: { production_id: { in: pendingIds } },
    select: { production_id: true, approved_qty: true, given_from_tank_no: true }
  });

  // 4. Fetch production indent details for these IDs
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: pendingIds } },
    orderBy: { created_at: 'desc' }
  });

  return indents.map(indent => {
    const planned = alreadyPlanned.find(p => p.production_id === indent.production_id);
    const approval = approvals.find(a => a.production_id === indent.production_id);
    return {
      ...indent,
      actual_qty_kg: planned && planned.actual_qty_kg !== null ? Number(planned.actual_qty_kg) : null,
      approved_qty: approval && approval.approved_qty !== null ? Number(approval.approved_qty) : null,
      given_from_tank_no: approval ? approval.given_from_tank_no : null,
      dispatch_additives: planned ? planned.additives : null,
    };
  });
};

/**
 * Get oil receipt history:
 * Items that are in oil_receipt, joined with production indent details
 */
const getOilReceiptHistory = async () => {
  const history = await prisma.oilReceipt.findMany({
    orderBy: { created_at: 'desc' }
  });

  const productionIds = history.map(h => h.production_id);
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: productionIds } }
  });

  const planned = await prisma.dispatchPlanningPlant.findMany({
    where: { production_id: { in: productionIds } },
    select: { production_id: true, actual_qty_kg: true }
  });

  const approvals = await prisma.indentApproval.findMany({
    where: { production_id: { in: productionIds } },
    select: { production_id: true, approved_qty: true, given_from_tank_no: true }
  });

  return history.map(h => {
    const indent = indents.find(i => i.production_id === h.production_id);
    const plan = planned.find(p => p.production_id === h.production_id);
    const approval = approvals.find(a => a.production_id === h.production_id);
    return { 
      ...h, 
      indentDetails: indent ? {
        ...indent,
        actual_qty_kg: plan && plan.actual_qty_kg !== null ? Number(plan.actual_qty_kg) : null,
        approved_qty: approval && approval.approved_qty !== null ? Number(approval.approved_qty) : null,
        given_from_tank_no: approval ? approval.given_from_tank_no : null
      } : null 
    };
  });
};

/**
 * Create oil receipt record
 */
const createOilReceipt = async (data) => {
  const { productionId, receivedQty, receivedBy, receivedDate, remarks } = data;

  const result = await prisma.oilReceipt.create({
    data: {
      production_id: productionId,
      received_qty: Number(receivedQty),
      received_by: receivedBy,
      received_date: receivedDate ? new Date(receivedDate) : new Date(),
      remarks: remarks || null,
      status: 'Received'
    }
  });

  return result;
};

module.exports = {
  getPendingOilReceipts,
  getOilReceiptHistory,
  createOilReceipt,
};
