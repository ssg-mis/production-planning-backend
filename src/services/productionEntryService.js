const { prisma } = require('../config/db');

/**
 * Get pending production entries:
 * Items in raw_material_receipt with remaining quantity to be processed
 */
const getPendingProductionEntries = async () => {
    // 1. Get all received items
    const allReceived = await prisma.rawMaterialReceipt.findMany({
        where: { status: 'Received' }
    });
    if (allReceived.length === 0) return [];

    // 2. Get all production entries to calculate processed quantities
    const allProduced = await prisma.productionEntry.findMany({
        select: { receipt_id: true, actual_qty: true, oil_qty: true }
    });

    // 3. Calculate remaining quantity for each receipt
    const pendingReceipts = allReceived.map(receipt => {
        const matchingEntries = allProduced.filter(p => p.receipt_id === receipt.id);
        const totalProcessedThisReceipt = matchingEntries.reduce((acc, curr) => acc + Number(curr.oil_qty || 0), 0);
        const remainingOilToProcess = Number(receipt.oil_qty || 0) - totalProcessedThisReceipt;

        if (remainingOilToProcess <= 0.01) return null; // Fully processed (with small float tolerance)

        return {
            ...receipt,
            remaining_oil_qty: remainingOilToProcess
        };
    }).filter(Boolean);

    if (pendingReceipts.length === 0) return [];

    const productionIds = [...new Set(pendingReceipts.map(r => r.production_id))];
    const issueIds = [...new Set(pendingReceipts.map(r => r.issue_id).filter(Boolean))];

    // 4. Fetch related data
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const issues = await prisma.rawMaterialIssue.findMany({
        where: { id: { in: issueIds } }
    });

    const packingIndents = await prisma.packingRawMaterialIndent.findMany({
        where: { id: { in: issues.map(i => i.indent_id).filter(Boolean) } },
        include: { bom_items: true }
    });

    return pendingReceipts.map(receipt => {
        const prodIndent = indents.find(i => i.production_id === receipt.production_id);
        const issue = issues.find(i => i.id === receipt.issue_id);
        const pIndent = issue ? packingIndents.find(p => p.id === issue.indent_id) : null;

        return {
            ...(prodIndent || {}),
            id: receipt.id, // Use Receipt ID for selection tracking
            production_id: receipt.production_id,
            receipt_id: receipt.id,
            issue_id: receipt.issue_id,
            oil_qty: receipt.remaining_oil_qty,
            total_received_qty: Number(receipt.oil_qty || 0),
            bom: pIndent ? pIndent.bom_items : [],
            status: 'Pending'
        };
    });
};

/**
 * Get production entry history
 */
const getProductionEntryHistory = async () => {
    const history = await prisma.productionEntry.findMany({
        orderBy: { processed_date: 'desc' }
    });

    const productionIds = history.map(h => h.production_id);
    const receiptIds = history.map(h => h.receipt_id).filter(Boolean);

    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const receipts = await prisma.rawMaterialReceipt.findMany({
        where: { id: { in: receiptIds } }
    });

    const issues = await prisma.rawMaterialIssue.findMany({
        where: { id: { in: receipts.map(r => r.issue_id).filter(Boolean) } }
    });

    const packingIndents = await prisma.packingRawMaterialIndent.findMany({
        where: { id: { in: issues.map(i => i.indent_id).filter(Boolean) } },
        include: { bom_items: true }
    });

    return history.map(h => {
        const prodIndent = indents.find(i => i.production_id === h.production_id);
        const receipt = receipts.find(r => r.id === h.receipt_id);
        const issue = receipt ? issues.find(i => i.id === receipt.issue_id) : null;
        const pIndent = issue ? packingIndents.find(p => p.id === issue.indent_id) : null;

        return {
            ...h,
            indentDetails: prodIndent || null,
            oil_qty: h.oil_qty ? Number(h.oil_qty) : (receipt?.oil_qty ? Number(receipt.oil_qty) : 0),
            bom: pIndent ? pIndent.bom_items : []
        };
    });
};

/**
 * Create production entry record
 */
const createProductionEntry = async (data) => {
    const { productionId, actualQty, remarks, processedBy, bomConsumption, receiptId, oilQty } = data;

    return await prisma.productionEntry.create({
        data: {
            production_id: productionId,
            receipt_id: receiptId ? Number(receiptId) : null,
            actual_qty: actualQty ? Number(actualQty) : null,
            oil_qty: oilQty ? Number(oilQty) : null,
            remarks: remarks,
            processed_by: processedBy,
            status: 'Completed',
            bom_consumption: bomConsumption
        }
    });
};

module.exports = {
    getPendingProductionEntries,
    getProductionEntryHistory,
    createProductionEntry
};
