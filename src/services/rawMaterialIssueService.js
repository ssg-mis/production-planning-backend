const { prisma } = require('../config/db');

/**
 * Get pending raw material issues:
 * Items in packing_raw_material_indent NOT yet in raw_material_issue
 */
const getPendingRawMaterialIssues = async () => {
    // 1. Get all packing indents
    const allPackingIndents = await prisma.packingRawMaterialIndent.findMany({
        include: { bom_items: true }
    });
    if (allPackingIndents.length === 0) return [];

    // 2. Get already issued indent IDs
    const alreadyIssued = await prisma.rawMaterialIssue.findMany({
        select: { indent_id: true }
    });
    const issuedIndentIds = alreadyIssued.map(i => i.indent_id).filter(Boolean);

    // 3. Pending indents = those not yet issued
    const pendingPackingIndents = allPackingIndents.filter(p => !issuedIndentIds.includes(p.id));
    if (pendingPackingIndents.length === 0) return [];

    const productionIds = [...new Set(pendingPackingIndents.map(p => p.production_id))];

    // 4. Fetch production indent details
    const productionIndents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    return pendingPackingIndents.map(p => {
        const prodIndent = productionIndents.find(pi => pi.production_id === p.production_id);
        return {
            ...(prodIndent || {}),
            id: p.id, // Use Packing Indent ID
            production_id: p.production_id,
            packing_indent_id: p.id,
            oil_qty: Number(p.oil_qty || 0),
            bom: p.bom_items || [],
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
    const indentIds = history.map(h => h.indent_id).filter(Boolean);

    const productionIndents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    const packingIndents = await prisma.packingRawMaterialIndent.findMany({
        where: { id: { in: indentIds } },
        include: { bom_items: true }
    });

    return history.map(h => {
        const prodIndent = productionIndents.find(pi => pi.production_id === h.production_id);
        const pIndent = packingIndents.find(pi => pi.id === h.indent_id);
        return {
            ...h,
            indentDetails: prodIndent || null,
            oil_qty: h.oil_qty ? Number(h.oil_qty) : (pIndent ? Number(pIndent.oil_qty) : 0),
            bom: pIndent ? pIndent.bom_items : []
        };
    });
};

/**
 * Create raw material issue record
 */
const createRawMaterialIssue = async (data) => {
    const { productionId, remarks, issuedBy, indentId, oilQty } = data;

    return await prisma.rawMaterialIssue.create({
        data: {
            production_id: productionId,
            indent_id: indentId ? Number(indentId) : null,
            oil_qty: oilQty ? Number(oilQty) : null,
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
