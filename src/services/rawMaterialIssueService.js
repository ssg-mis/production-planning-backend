const { prisma } = require('../config/db');

/**
 * Get pending raw material issues:
 * Items in packing_raw_material_indent NOT yet in raw_material_issue
 */
const getPendingRawMaterialIssues = async () => {
    // 1. Get all indented items
    const allIndented = await prisma.packingRawMaterialIndent.findMany({
        select: { production_id: true }
    });
    const indentedIds = allIndented.map(i => i.production_id);
    if (indentedIds.length === 0) return [];

    // 2. Get items already in raw_material_issue
    const alreadyIssued = await prisma.rawMaterialIssue.findMany({
        select: { production_id: true }
    });
    const issuedIds = alreadyIssued.map(i => i.production_id);

    // 3. Pending = indented but not yet issued
    const pendingIds = indentedIds.filter(id => !issuedIds.includes(id));
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

    return indents.map(item => {
        const pIndent = packingIndents.find(p => p.production_id === item.production_id);
        return {
            ...item,
            tank_no: item.tank_no,
            given_from_tank_no: item.given_from_tank_no,
            bom: pIndent ? pIndent.bom_items : [],
            status: 'Pending'
        };
    });
};

/**
 * Get raw material issue history
 */
const getRawMaterialIssueHistory = async () => {
    const history = await prisma.rawMaterialIssue.findMany({
        orderBy: { issued_date: 'desc' }
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
 * Create raw material issue record
 */
const createRawMaterialIssue = async (data) => {
    const { productionId, remarks, issuedBy } = data;

    return await prisma.rawMaterialIssue.create({
        data: {
            production_id: productionId,
            remarks: remarks,
            issued_by: issuedBy,
            status: 'Issued'
        }
    });
};

module.exports = {
    getPendingRawMaterialIssues,
    getRawMaterialIssueHistory,
    createRawMaterialIssue
};
