const { prisma } = require('../config/db');

/**
 * Get pending raw material receipts:
 * Items in raw_material_issue NOT yet in raw_material_receipt
 */
const getPendingRawMaterialReceipts = async () => {
    // 1. Get all issued items (using raw SQL for robustness)
    let allIssued = [];
    try {
        allIssued = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_issue WHERE status = 'Issued'`);
        if (!allIssued || allIssued.length === 0) {
            allIssued = await prisma.rawMaterialIssue.findMany({ where: { status: 'Issued' } });
        }
    } catch (err) {
        console.error('[RMReceipt] Error fetching issues:', err.message);
        allIssued = await prisma.rawMaterialIssue.findMany({ where: { status: 'Issued' } });
    }
    if (allIssued.length === 0) return [];

    // 2. Get items already in raw_material_receipt
    let alreadyReceived = [];
    try {
        alreadyReceived = await prisma.rawMaterialReceipt.findMany({
            select: { issue_id: true }
        });
    } catch (err) {
        console.error('Error fetching already received items (missing issue_id?):', err.message);
        try {
            alreadyReceived = await prisma.$queryRawUnsafe(`SELECT issue_id FROM raw_material_receipt`);
        } catch (rawErr) {
            console.error('Raw fallback for already received items failed:', rawErr.message);
        }
    }
    const receivedIssueIds = (alreadyReceived || []).map(r => r.issue_id).filter(Boolean);

    // 3. Pending = issued but not yet received
    const pendingIssues = allIssued.filter(i => !receivedIssueIds.includes(i.id));
    if (pendingIssues.length === 0) return [];

    const productionIds = [...new Set(pendingIssues.map(i => i.production_id))];
    const indentIds = [...new Set(pendingIssues.map(i => i.indent_id).filter(Boolean))];

    // 4. Fetch related data
    let indents = [];
    let approvals = [];
    try {
        indents = await prisma.productionIndent.findMany({
            where: { production_id: { in: productionIds } }
        });
        approvals = await prisma.indentApproval.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching related data for receipt:', err.message);
        try {
            if (productionIds.length > 0) {
                const idString = productionIds.map(id => `'${id}'`).join(',');
                indents = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id IN (${idString})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for indents failed in receipt:', rawErr.message);
        }
    }

    // Use raw SQL for packing indents to avoid Prisma client sync issues with selected_skus
    const idList = indentIds.length > 0 ? indentIds.join(',') : '0';
    let packingIndents = [];
    if (idList !== '0') {
        try {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT id, production_id, status, created_at, oil_qty, selected_skus 
                FROM packing_raw_material_indent
                WHERE id IN (${idList})
            `);
        } catch (err) {
            console.error('Error fetching packing indents for receipt via raw SQL:', err.message);
        }
    }

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
    let history = [];
    try {
        history = await prisma.rawMaterialReceipt.findMany({
            orderBy: { received_date: 'desc' }
        });
    } catch (err) {
        console.error('Error fetching raw material receipt history:', err.message);
        try {
            history = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_receipt ORDER BY received_date DESC`);
        } catch (rawErr) {
            console.error('Raw fallback for receipt history failed:', rawErr.message);
        }
    }

    const productionIds = history.map(h => h.production_id);
    const issueIds = history.map(h => h.issue_id).filter(Boolean);

    let indents = [];
    let issues = [];
    let approvals = [];
    try {
        indents = await prisma.productionIndent.findMany({
            where: { production_id: { in: productionIds } }
        });
        issues = await prisma.rawMaterialIssue.findMany({
            where: { id: { in: issueIds } }
        });
        approvals = await prisma.indentApproval.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching data for receipt history:', err.message);
        try {
            if (productionIds.length > 0) {
                const idString = productionIds.map(id => `'${id}'`).join(',');
                indents = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id IN (${idString})`);
            }
            if (issueIds.length > 0) {
                issues = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_issue WHERE id IN (${issueIds.join(',')})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for history failed in receipt:', rawErr.message);
        }
    }

    const packingIndentIds = issues.map(i => i.indent_id).filter(Boolean);
    const packingIdList = packingIndentIds.length > 0 ? packingIndentIds.join(',') : '0';
    let packingIndents = [];
    if (packingIdList !== '0') {
        try {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT id, production_id, status, created_at, oil_qty, selected_skus 
                FROM packing_raw_material_indent
                WHERE id IN (${packingIdList})
            `);
        } catch (err) {
            console.error('Error fetching packing indents history for receipt via raw SQL:', err.message);
        }
    }

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

    console.log(`[RMReceipt] Creating receipt for prodId: ${productionId} | oilQty: ${oilQty}`);
    const result = await prisma.rawMaterialReceipt.create({
        data: {
            production_id: productionId,
            // issue_id: issueId ? Number(issueId) : null,
            // oil_qty: oilQty ? Number(oilQty) : null,
            remarks: remarks,
            received_by: receivedBy,
            status: 'Received'
        }
    });

    // Update new columns via raw SQL
    try {
        console.log(`[RMReceipt] Updating raw columns for ID: ${result.id} | issueId: ${issueId} | qty: ${oilQty}`);
        await prisma.$executeRawUnsafe(
            `UPDATE raw_material_receipt SET issue_id = $1, oil_qty = $2 WHERE id = $3`,
            issueId ? Number(issueId) : null,
            oilQty ? Number(oilQty) : null,
            result.id
        );
        console.log(`[RMReceipt] Update successful`);
    } catch (err) {
        console.error('[RMReceipt] Update failed:', err.message);
        console.warn('Warning: Could not update RM Receipt new columns via raw SQL:', err.message);
    }

    return result;
};

module.exports = {
    getPendingRawMaterialReceipts,
    getRawMaterialReceiptHistory,
    createRawMaterialReceipt
};
