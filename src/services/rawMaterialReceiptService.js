const { prisma } = require('../config/db');

/**
 * Get pending raw material receipts:
 * Items in raw_material_issue NOT yet in raw_material_receipt
 */
const getPendingRawMaterialReceipts = async () => {
    // 1. Get all issued items
    const allIssued = await prisma.rawMaterialIssue.findMany({
        select: { production_id: true }
    });
    const issuedIds = allIssued.map(i => i.production_id);
    if (issuedIds.length === 0) return [];

    // 2. Get items already in raw_material_receipt
    const alreadyReceived = await prisma.rawMaterialReceipt.findMany({
        select: { production_id: true }
    });
    const receivedIds = alreadyReceived.map(i => i.production_id);

    // 3. Pending = issued but not yet received
    const pendingIds = issuedIds.filter(id => !receivedIds.includes(id));
    if (pendingIds.length === 0) return [];

    // 4. Fetch production indent details and BOM for these IDs
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: pendingIds } },
        orderBy: { created_at: 'desc' }
    });

    const packingIndents = await prisma.packingRawMaterialIndent.findMany({
        where: { production_id: { in: pendingIds } },
        include: { bom_items: true }
    });

    const issues = await prisma.rawMaterialIssue.findMany({
        where: { production_id: { in: pendingIds } }
    });

    return indents.map(item => {
        const pIndent = packingIndents.find(p => p.production_id === item.production_id);
        const issue = issues.find(i => i.production_id === item.production_id);
        return {
            ...item,
            tank_no: item.tank_no,
            given_from_tank_no: item.given_from_tank_no,
            bom: pIndent ? pIndent.bom_items : [],
            issueDetails: issue || null,
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
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const packingIndents = await prisma.packingRawMaterialIndent.findMany({
        where: { production_id: { in: productionIds } },
        include: { bom_items: true }
    });

    return history.map(h => {
        const indent = indents.find(i => i.production_id === h.production_id);
        const pIndent = packingIndents.find(p => p.production_id === h.production_id);
        return {
            ...h,
            indentDetails: indent || null,
            bom: pIndent ? pIndent.bom_items : []
        };
    });
};

/**
 * Create raw material receipt record
 */
const createRawMaterialReceipt = async (data) => {
    const { productionId, remarks, receivedBy } = data;

    return await prisma.rawMaterialReceipt.create({
        data: {
            production_id: productionId,
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
