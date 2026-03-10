const { prisma } = require('../config/db');

/**
 * Get pending lab confirmations
 * Items present in IndentApproval (status='Confirmed') but NOT in LabConfirmation
 */
const getPendingLabConfirmations = async () => {
  const approvedIndents = await prisma.indentApproval.findMany({
    where: { status: 'Confirmed' },
    select: { production_id: true, approval_date: true, given_from_tank_no: true, approved_qty: true }
  });

  const approvedIds = approvedIndents.map(i => i.production_id);
  if (approvedIds.length === 0) return [];

  const processedLabs = await prisma.labConfirmation.findMany({
    select: { production_id: true }
  });
  const processedIds = processedLabs.map(l => l.production_id);

  const pendingIds = approvedIds.filter(id => !processedIds.includes(id));
  if (pendingIds.length === 0) return [];

  const pendingIndents = await prisma.productionIndent.findMany({
    where: { production_id: { in: pendingIds } },
    orderBy: { created_at: 'desc' }
  });

  // Attach approval_date from approvedIndents to each indent
  return pendingIndents.map(indent => {
    const approval = approvedIndents.find(ai => ai.production_id === indent.production_id);
    return {
      ...indent,
      approval_date: approval ? approval.approval_date : null,
      given_from_tank_no: approval ? approval.given_from_tank_no : null,
      approved_qty: approval ? approval.approved_qty : null
    };
  });
};

/**
 * Get lab confirmation history
 */
const getLabHistory = async () => {
  const history = await prisma.labConfirmation.findMany({
    orderBy: { lab_date: 'desc' }
  });

  const productionIds = history.map(h => h.production_id);
  const indents = await prisma.productionIndent.findMany({
    where: { production_id: { in: productionIds } }
  });

  const approvedIndents = await prisma.indentApproval.findMany({
    where: { production_id: { in: productionIds } },
    select: { production_id: true, approval_date: true, given_from_tank_no: true, approved_qty: true }
  });

  return history.map(h => {
    const indent = indents.find(i => i.production_id === h.production_id);
    const approval = approvedIndents.find(ai => ai.production_id === h.production_id);
    return {
      ...h,
      indentDetails: indent ? {
        ...indent,
        approval_date: approval ? approval.approval_date : null,
        given_from_tank_no: approval ? approval.given_from_tank_no : null,
        approved_qty: approval ? approval.approved_qty : null
      } : null
    };
  });
};

/**
 * Create lab confirmation — stores each field in its own column
 */
const createLabConfirmation = async (data) => {
  const { productionId, status, remarks, testParams } = data;

  if (status === 'Rejected') {
    // Rollback: Delete from IndentApproval so it reappears in Indent Approval pending list
    await prisma.indentApproval.deleteMany({
      where: { production_id: productionId }
    });
    return { status: 'Rejected', rolledBack: true };
  }

  const result = await prisma.labConfirmation.create({
    data: {
      production_id:         productionId,
      status:                status,
      remarks:               remarks || null,
      issued_quantity:       testParams?.issuedQuantity ? parseFloat(testParams.issuedQuantity) : null,
      date_of_issue:         testParams?.dateOfIssue ? new Date(testParams.dateOfIssue) : null,
      issued_by:             testParams?.issuedBy || null,
      qa_status:             testParams?.qaStatus || null,
      certificate_file:      testParams?.certificateFile || null,
      certificate_file_name: testParams?.certificateFileName || null,
      lab_report_given_by:   testParams?.labReportGivenBy || null,
      additives:             testParams?.additives || null,
    }
  });

  return result;
};

module.exports = {
  getPendingLabConfirmations,
  getLabHistory,
  createLabConfirmation
};
