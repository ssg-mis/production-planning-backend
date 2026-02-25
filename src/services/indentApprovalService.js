const { prisma } = require('../config/db');

/**
 * Get pending approvals
 * Items in ProductionIndent but NOT in IndentApproval
 */
const getPendingApprovals = async () => {
  // 1. Get all processed production_ids
  const processedIndents = await prisma.indentApproval.findMany({
    select: { production_id: true }
  });
  
  const processedIds = processedIndents.map(i => i.production_id);

  // 2. Fetch ProductionIndents NOT in processedIds
  // If list is empty, fetch all
  const whereCondition = processedIds.length > 0 
    ? { production_id: { notIn: processedIds } }
    : {};

  const pendingIndents = await prisma.productionIndent.findMany({
    where: whereCondition,
    orderBy: { created_at: 'desc' }
  });

  return pendingIndents;
};

/**
 * Get approval history
 * Items present in IndentApproval, joined with ProductionIndent info
 */
const getApprovalHistory = async () => {
  // Fetch approvals
  const approvals = await prisma.indentApproval.findMany({
    orderBy: { approval_date: 'desc' }
  });

  // Fetch related indent details
  // Since we didn't set up a formal relation, we'll fetch manual join or all
  // Optimization: Fetch only relevant production_ids
  const productionIds = approvals.map(a => a.production_id);
  
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: productionIds } }
  });

  // Merge data
  const history = approvals.map(approval => {
    const indent = indents.find(i => i.production_id === approval.production_id);
    return {
      ...approval,
      indentDetails: indent || null
    };
  });

  return history;
};

/**
 * Create new approval/rejection
 */
const createApproval = async (data) => {
  const { productionId, approvedWeightKg, status, remarks, givenFromTankNo } = data;

  const result = await prisma.indentApproval.create({
    data: {
      production_id: productionId,
      approved_qty: approvedWeightKg || 0,
      status: status,
      remarks: remarks,
      given_from_tank_no: givenFromTankNo || null
    }
  });

  return result;
};

module.exports = {
  getPendingApprovals,
  getApprovalHistory,
  createApproval
};
