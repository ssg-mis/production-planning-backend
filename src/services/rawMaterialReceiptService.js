const { prisma } = require('../config/db');

/**
 * Get pending raw material receipts:
 * Items in raw_material_issue NOT yet in raw_material_receipt
 */
const getPendingRawMaterialReceipts = async () => {
    // 1. Get all issued items
    const allIssued = await prisma.rawMaterialIssue.findMany({
        where: { status: 'Issued' }
    });
    if (allIssued.length === 0) return [];

    // 2. Get items already in raw_material_receipt
    const alreadyReceived = await prisma.rawMaterialReceipt.findMany({
        select: { issue_id: true }
    });
    const receivedIssueIds = alreadyReceived.map(r => r.issue_id).filter(Boolean);

    // 3. Pending = issued but not yet received
    const pendingIssues = allIssued.filter(i => !receivedIssueIds.includes(i.id));
    if (pendingIssues.length === 0) return [];

    const productionIds = [...new Set(pendingIssues.map(i => i.production_id))];
    const indentIds = [...new Set(pendingIssues.map(i => i.indent_id).filter(Boolean))];

    // 4. Fetch related data
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const approvals = await prisma.indentApproval.findMany({
        where: { production_id: { in: productionIds } }
    });

    // Use raw SQL for packing indents to avoid Prisma client sync issues with selected_skus
    const idList = indentIds.length > 0 ? indentIds.join(',') : '0';
    const packingIndents = await prisma.$queryRawUnsafe(`
        SELECT id, production_id, status, created_at, oil_qty, selected_skus 
        FROM packing_raw_material_indent
        WHERE id IN (${idList})
    `);

    // Fetch BOM items
    const bomItems = await prisma.packingRawMaterialBOM.findMany({
        where: { indent_id: { in: indentIds } }
    });

    return pendingIssues.map(issue => {
        const prodIndent = indents.find(i => i.production_id === issue.production_id);
        const pIndent = packingIndents.find(p => p.id === issue.indent_id);
        const approval = approvals.find(a => a.production_id === issue.production_id);
        
        const bom = pIndent ? bomItems.filter(b => b.indent_id === pIndent.id) : [];

        return {
            ...(prodIndent || {}),
            id: issue.id, // Use Issue ID for selection tracking
            production_id: issue.production_id,
            issue_id: issue.id,
            indent_id: issue.indent_id,
            oil_qty: issue.oil_qty ? Number(issue.oil_qty) : (pIndent ? Number(pIndent.oil_qty) : 0),
            given_from_tank_no: approval ? approval.given_from_tank_no : '-',
            selected_skus: pIndent ? (pIndent.selected_skus || []) : [],
            bom: bom,
            status: 'Pending'
        };
    });
};

/**
 * Get raw material receipt history
 */
const getRawMaterialReceiptHistory = async () => {
    const history = await prisma.rawMaterialReceipt.findMany({
        orderBy: { received_date: 'desc' }
    });

    const productionIds = history.map(h => h.production_id);
    const issueIds = history.map(h => h.issue_id).filter(Boolean);

    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const issues = await prisma.rawMaterialIssue.findMany({
        where: { id: { in: issueIds } }
    });

    const approvals = await prisma.indentApproval.findMany({
        where: { production_id: { in: productionIds } }
    });

    const packingIndentIds = issues.map(i => i.indent_id).filter(Boolean);
    const packingIdList = packingIndentIds.length > 0 ? packingIndentIds.join(',') : '0';
    const packingIndents = await prisma.$queryRawUnsafe(`
        SELECT id, production_id, status, created_at, oil_qty, selected_skus 
        FROM packing_raw_material_indent
        WHERE id IN (${packingIdList})
    `);

    // Fetch BOM items for history
    const allBomItems = await prisma.packingRawMaterialBOM.findMany({
        where: { indent_id: { in: packingIndentIds } }
    });

    return history.map(h => {
        const prodIndent = indents.find(i => i.production_id === h.production_id);
        const issue = issues.find(i => i.id === h.issue_id);
        const approval = approvals.find(a => a.production_id === h.production_id);
        const pIndent = issue ? packingIndents.find(p => p.id === issue.indent_id) : null;
        const bom = pIndent ? allBomItems.filter(b => b.indent_id === pIndent.id) : [];

        return {
            ...h,
            indentDetails: prodIndent || null,
            oil_qty: h.oil_qty ? Number(h.oil_qty) : (issue?.oil_qty ? Number(issue.oil_qty) : 0),
            given_from_tank_no: approval ? approval.given_from_tank_no : '-',
            selected_skus: pIndent ? (pIndent.selected_skus || []) : [],
            bom: bom
        };
    });
};

/**
 * Create raw material receipt record
 */
const createRawMaterialReceipt = async (data) => {
    const { productionId, remarks, receivedBy, issueId, oilQty } = data;

    return await prisma.rawMaterialReceipt.create({
        data: {
            production_id: productionId,
            issue_id: issueId ? Number(issueId) : null,
            oil_qty: oilQty ? Number(oilQty) : null,
            remarks: remarks,
            received_by: receivedBy,
            status: 'Received'
        }
    });
};

module.exports = {
    getPendingRawMaterialReceipts,
    getRawMaterialReceiptHistory,
    createRawMaterialReceipt
};
