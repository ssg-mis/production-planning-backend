const { prisma } = require('../config/db');

/**
 * Get pending raw material issues:
 * Items in packing_raw_material_indent NOT yet in raw_material_issue
 */
const getPendingRawMaterialIssues = async () => {
    // 1. Get all packing indents using queryRaw for selected_skus
    let allPackingIndents = [];
    try {
        allPackingIndents = await prisma.$queryRawUnsafe(`
            SELECT id, production_id, status, created_at, oil_qty, selected_skus 
            FROM packing_raw_material_indent
        `);
    } catch (err) {
        console.error('Error fetching packing indents via raw SQL:', err.message);
        // Fallback or empty list
    }
    
    // Fetch BOM items separately (or we could join, but let's keep it simple)
    const bomItems = await prisma.packingRawMaterialBOM.findMany();
    
    allPackingIndents.forEach(indent => {
        indent.bom_items = bomItems.filter(b => b.indent_id === indent.id);
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
            selected_skus: p.selected_skus || [], // Return the selected SKUs
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

    let packingIndents = [];
    if (indentIds.length > 0) {
        try {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT id, production_id, status, created_at, oil_qty, selected_skus 
                FROM packing_raw_material_indent
                WHERE id IN (${idList})
            `);
        } catch (err) {
            console.error('Error fetching packing indents history via raw SQL:', err.message);
        }
    }
    
    // Attach BOM items manually for history
    const allBomItems = await prisma.packingRawMaterialBOM.findMany({
        where: { indent_id: { in: indentIds } }
    });

    packingIndents.forEach(indent => {
        indent.bom_items = allBomItems.filter(b => b.indent_id === indent.id);
    });

    return history.map(h => {
        const prodIndent = productionIndents.find(pi => pi.production_id === h.production_id);
        const pIndent = packingIndents.find(pi => pi.id === h.indent_id);
        return {
            ...h,
            indentDetails: prodIndent || null,
            oil_qty: h.oil_qty ? Number(h.oil_qty) : (pIndent ? Number(pIndent.oil_qty) : 0),
            selected_skus: pIndent ? (pIndent.selected_skus || []) : [],
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
