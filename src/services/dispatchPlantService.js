const { prisma } = require('../config/db');

/**
 * Get pending dispatch planning items:
 * Items in lab_confirmation (status='Confirmed') NOT yet in dispatch_planning_plant
 */
const getPendingDispatchPlant = async () => {
  // 1. Get all confirmed lab confirmations
  const labConfirmed = await prisma.labConfirmation.findMany({
    where: { status: 'Confirmed' },
    select: { production_id: true }
  });
  const confirmedIds = labConfirmed.map(l => l.production_id);
  if (confirmedIds.length === 0) return [];

  // 2. Get already planned items
  const alreadyPlanned = await prisma.dispatchPlanningPlant.findMany({
    select: { production_id: true }
  });
  const plannedIds = alreadyPlanned.map(d => d.production_id);

  // 3. Pending = confirmed but not yet planned
  const pendingIds = confirmedIds.filter(id => !plannedIds.includes(id));
  if (pendingIds.length === 0) return [];

  // 4. Fetch production indent details for these IDs
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: pendingIds } },
    orderBy: { created_at: 'desc' }
  });

  // 5. Fetch approved data (approved_qty, given_from_tank_no, approval_date)
  const approvals = await prisma.indentApproval.findMany({
    where: { production_id: { in: pendingIds } },
    select: {
      production_id: true,
      approved_qty: true,
      given_from_tank_no: true,
      approval_date: true
    }
  });

  return indents.map(indent => {
    const approval = approvals.find(a => a.production_id === indent.production_id);
    return {
      ...indent,
      approved_qty: approval ? approval.approved_qty : null,
      given_from_tank_no: approval ? approval.given_from_tank_no : null,
      approval_date: approval ? approval.approval_date : null
    };
  });
};

/**
 * Get dispatch planning plant history:
 * Items that are in dispatch_planning_plant, joined with production indent details
 */
const getDispatchPlantHistory = async () => {
  const history = await prisma.dispatchPlanningPlant.findMany({
    orderBy: { planned_date: 'desc' }
  });

  const productionIds = history.map(h => h.production_id);
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: productionIds } }
  });

  const approvals = await prisma.indentApproval.findMany({
    where: { production_id: { in: productionIds } },
    select: {
      production_id: true,
      approved_qty: true,
      given_from_tank_no: true,
      approval_date: true
    }
  });

  return history.map(h => {
    const indent = indents.find(i => i.production_id === h.production_id);
    const approval = approvals.find(a => a.production_id === h.production_id);
    return { 
      ...h, 
      indentDetails: indent ? {
        ...indent,
        approved_qty: approval ? approval.approved_qty : null,
        given_from_tank_no: approval ? approval.given_from_tank_no : null,
        approval_date: approval ? approval.approval_date : null
      } : null 
    };
  });
};

/**
 * Create dispatch planning plant record
 */
const createDispatchPlanningPlant = async (data) => {
  const { productionId, remarks, additives, actualQtyKg } = data;

  const result = await prisma.dispatchPlanningPlant.create({
    data: {
      production_id: productionId,
      status: 'Planned',
      remarks: remarks || null,
      additives: additives || [],
      actual_qty_kg: actualQtyKg ? parseFloat(actualQtyKg) : null,
    }
  });

  return result;
};

module.exports = {
  getPendingDispatchPlant,
  getDispatchPlantHistory,
  createDispatchPlanningPlant,
};
