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
 * Handles partial approvals by creating a new pending indent for the remaining balance
 */
const createApproval = async (data) => {
  const { productionId, approvedWeightKg, status, remarks, givenFromTankNo } = data;

  // 1. Fetch the original indent to get full details and indent_quantity
  const originalIndent = await prisma.productionIndent.findUnique({
    where: { production_id: productionId }
  });

  if (!originalIndent) {
    throw new Error(`Production indent ${productionId} not found`);
  }

  const indentQty = parseFloat(originalIndent.indent_quantity) || 0;
  const approved = parseFloat(approvedWeightKg) || 0;

  // 2. Create the approval record
  const result = await prisma.indentApproval.create({
    data: {
      production_id: productionId,
      approved_qty: approved,
      status: status,
      remarks: remarks,
      given_from_tank_no: givenFromTankNo || null
    }
  });

  // 3. If partial approval (approved < indentQty), create a new pending indent for the remainder
  if (status === 'Confirmed' && approved < indentQty) {
    const remainingQty = indentQty - approved;

    // Generate a new production ID for the remaining indent
    const { getNextProductionId } = require('./productionIndentService');
    const newProductionId = await getNextProductionId();

    await prisma.productionIndent.create({
      data: {
        production_id: newProductionId,
        order_id: originalIndent.order_id,
        product_name: originalIndent.product_name,
        packing_size: originalIndent.packing_size,
        packing_type: originalIndent.packing_type,
        party_name: originalIndent.party_name,
        oil_required: originalIndent.oil_required,
        selected_oil: originalIndent.selected_oil,
        indent_quantity: remainingQty,
        total_weight_kg: remainingQty,
        tank_no: originalIndent.tank_no,
        status: 'Submitted'  // Stays pending for approval
      }
    });

    console.log(`Partial approval: created new pending indent ${newProductionId} for remaining ${remainingQty} Kg`);
  }

  return result;
};

module.exports = {
  getPendingApprovals,
  getApprovalHistory,
  createApproval
};
