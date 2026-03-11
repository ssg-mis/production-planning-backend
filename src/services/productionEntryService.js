const { prisma } = require('../config/db');

/**
 * Get pending production entries:
 * Items in raw_material_receipt with remaining quantity to be processed
 */
const getPendingProductionEntries = async () => {
    // 1. Get all received items (using raw SQL because Prisma client might be outdated)
    let allReceived = [];
    try {
        allReceived = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_receipt WHERE status = 'Received'`);
        if (!allReceived || allReceived.length === 0) {
            // Fallback to findMany if raw failed for some reason
            allReceived = await prisma.rawMaterialReceipt.findMany({ where: { status: 'Received' } });
        }
    } catch (err) {
        console.error('[PendingPE] Error fetching receipts:', err.message);
        allReceived = await prisma.rawMaterialReceipt.findMany({ where: { status: 'Received' } });
    }
    console.log(`[PendingPE] Found ${allReceived.length} received items`);
    if (allReceived.length === 0) return [];

    // 2. Get all production entries to calculate processed quantities
    let allProduced = [];
    try {
        allProduced = await prisma.$queryRawUnsafe(`SELECT receipt_id, actual_qty, oil_qty FROM production_entry`);
    } catch (err) {
        console.error('[PendingPE] Error fetching production entries:', err.message);
        allProduced = await prisma.productionEntry.findMany({
            select: { receipt_id: true, actual_qty: true, oil_qty: true }
        });
    }

    // 3. Calculate remaining quantity for each receipt
    const pendingReceipts = allReceived.map(receipt => {
        const matchingEntries = allProduced.filter(p => p.receipt_id === receipt.id);
        const totalProcessedThisReceipt = matchingEntries.reduce((acc, curr) => acc + Number(curr.oil_qty || 0), 0);
        const remainingOilToProcess = Number(receipt.oil_qty || 0) - totalProcessedThisReceipt;

        console.log(`[PendingPE] Receipt ${receipt.id}: oil_qty=${receipt.oil_qty}, processed=${totalProcessedThisReceipt}, remaining=${remainingOilToProcess}`);

        if (remainingOilToProcess <= 0.01) return null; // Fully processed (with small float tolerance)

        return {
            ...receipt,
            remaining_oil_qty: remainingOilToProcess
        };
    }).filter(Boolean);

    console.log(`[PendingPE] Remaining receipts after filter: ${pendingReceipts.length}`);
    if (pendingReceipts.length === 0) return [];

    const productionIds = [...new Set(pendingReceipts.map(r => r.production_id))];
    const issueIds = [...new Set(pendingReceipts.map(r => r.issue_id).filter(Boolean))];

    // 4. Fetch related data
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
        console.error('Error fetching related data for production entry:', err.message);
        // Fallback for issues which is the most likely culprit
        try {
            if (issueIds.length > 0) {
                issues = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_issue WHERE id IN (${issueIds.join(',')})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for issues failed in production entry:', rawErr.message);
        }
    }

    // Use raw SQL for packing indents to avoid Prisma client sync issues with selected_skus
    const pIndentIds = issues.map(i => i.indent_id).filter(Boolean);
    const idList = pIndentIds.length > 0 ? pIndentIds.join(',') : '0';
    let packingIndents = [];
    if (idList !== '0') {
        try {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT id, production_id, status, created_at, oil_qty, selected_skus 
                FROM packing_raw_material_indent
                WHERE id IN (${idList})
            `);
        } catch (err) {
            console.error('Error fetching packing indents for production entry via raw SQL:', err.message);
        }
    }

    // Fetch BOM items
    let bomItems = [];
    try {
        bomItems = await prisma.packingRawMaterialBOM.findMany({
            where: { indent_id: { in: pIndentIds } }
        });
    } catch (err) {
        console.error('Error fetching BOM items for production entry:', err.message);
    }

    return pendingReceipts.map(receipt => {
        const prodIndent = indents.find(i => i.production_id === receipt.production_id);
        const issue = issues.find(i => i.id === receipt.issue_id);
        const pIndent = issue ? packingIndents.find(p => p.id === issue.indent_id) : null;
        const approval = approvals.find(a => a.production_id === receipt.production_id);
        
        const bom = pIndent ? bomItems.filter(b => b.indent_id === pIndent.id) : [];

        return {
            ...(prodIndent || {}),
            id: receipt.id, 
            production_id: receipt.production_id,
            receipt_id: receipt.id,
            issue_id: receipt.issue_id,
            oil_qty: receipt.remaining_oil_qty,
            total_received_qty: Number(receipt.oil_qty || 0),
            given_from_tank_no: approval ? approval.given_from_tank_no : '-',
            selected_skus: pIndent ? (pIndent.selected_skus || []) : [],
            bom: bom,
            status: 'Pending'
        };
    });
};

/**
 * Get production entry history
 */
const getProductionEntryHistory = async () => {
    let history = [];
    try {
        history = await prisma.productionEntry.findMany({
            orderBy: { processed_date: 'desc' }
        });
    } catch (err) {
        console.error('Error fetching production entry history:', err.message);
        try {
            history = await prisma.$queryRawUnsafe(`SELECT * FROM production_entry ORDER BY processed_date DESC`);
        } catch (rawErr) {
            console.error('Raw fallback for production entry history failed:', rawErr.message);
        }
    }

    const productionIds = history.map(h => h.production_id);
    const receiptIds = history.map(h => h.receipt_id).filter(Boolean);

    let indents = [];
    try {
        indents = await prisma.productionIndent.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching indents for production history:', err.message);
        try {
            if (productionIds.length > 0) {
                const idString = productionIds.map(id => `'${id}'`).join(',');
                indents = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id IN (${idString})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for history indents failed:', rawErr.message);
        }
    }

    let receipts = [];
    try {
        receipts = await prisma.rawMaterialReceipt.findMany({
            where: { id: { in: receiptIds } }
        });
    } catch (err) {
        console.error('Error fetching receipts for production history:', err.message);
        try {
            if (receiptIds.length > 0) {
                receipts = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_receipt WHERE id IN (${receiptIds.join(',')})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for receipts history failed:', rawErr.message);
        }
    }
 
    let issues = [];
    try {
        const issueIds = (receipts || []).map(r => r.issue_id).filter(Boolean);
        issues = await prisma.rawMaterialIssue.findMany({
            where: { id: { in: issueIds } }
        });
    } catch (err) {
        console.error('Error fetching issues for production history:', err.message);
        try {
            const issueIds = (receipts || []).map(r => r.issue_id).filter(Boolean);
            if (issueIds.length > 0) {
                issues = await prisma.$queryRawUnsafe(`SELECT * FROM raw_material_issue WHERE id IN (${issueIds.join(',')})`);
            }
        } catch (rawErr) {
            console.error('Raw fallback for issues history failed:', rawErr.message);
        }
    }

    let approvals = [];
    try {
        approvals = await prisma.indentApproval.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching approvals for production history:', err.message);
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
            console.error('Error fetching packing indents history for production entry via raw SQL:', err.message);
        }
    }

    // Fetch BOM items for history
    const allBomItems = await prisma.packingRawMaterialBOM.findMany({
        where: { indent_id: { in: packingIndentIds } }
    });
 
    return history.map(h => {
        const prodIndent = indents.find(i => i.production_id === h.production_id);
        const receipt = receipts.find(r => r.id === h.receipt_id);
        const issue = receipt ? issues.find(i => i.id === receipt.issue_id) : null;
        const approval = approvals.find(a => a.production_id === h.production_id);
        const pIndent = issue ? packingIndents.find(p => p.id === issue.indent_id) : null;
        const bom = pIndent ? allBomItems.filter(b => b.indent_id === pIndent.id) : [];
 
        return {
            ...h,
            indentDetails: prodIndent || null,
            oil_qty: h.oil_qty ? Number(h.oil_qty) : (receipt?.oil_qty ? Number(receipt.oil_qty) : 0),
            given_from_tank_no: approval ? approval.given_from_tank_no : '-',
            selected_skus: pIndent ? (pIndent.selected_skus || []) : [],
            bom: bom
        };
    });
};

/**
 * Create production entry record
 */
const createProductionEntry = async (data) => {
    const { productionId, actualQty, remarks, processedBy, bomConsumption, receiptId, oilQty } = data;

    const result = await prisma.productionEntry.create({
        data: {
            production_id: productionId,
            // receipt_id: receiptId ? Number(receiptId) : null,
            // actual_qty: actualQty ? Number(actualQty) : null,
            // oil_qty: oilQty ? Number(oilQty) : null,
            remarks: remarks,
            processed_by: processedBy,
            status: 'Completed',
            // bom_consumption: bomConsumption
        }
    });

    // Update new columns via raw SQL
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE production_entry SET receipt_id = $1, actual_qty = $2, oil_qty = $3, bom_consumption = $4::jsonb WHERE id = $5`,
            receiptId ? Number(receiptId) : null,
            actualQty ? Number(actualQty) : null,
            oilQty ? Number(oilQty) : null,
            JSON.stringify(bomConsumption || []),
            result.id
        );
    } catch (err) {
        console.warn('Warning: Could not update Production Entry new columns via raw SQL:', err.message);
    }

    return result;
};

module.exports = {
    getPendingProductionEntries,
    getProductionEntryHistory,
    createProductionEntry
};
