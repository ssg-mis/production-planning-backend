const { prisma } = require('../config/db');

/**
 * Get pending production entries:
 * Items in raw_material_receipt NOT yet in production_entry
 */
const getPendingProductionEntries = async () => {
    // 1. Get all received items
    const allReceived = await prisma.rawMaterialReceipt.findMany({
        select: { production_id: true }
    });
    const receivedIds = allReceived.map(r => r.production_id);
    if (receivedIds.length === 0) return [];

    // 2. Get items already in production_entry
    const alreadyProduced = await prisma.productionEntry.findMany({
        select: { production_id: true }
    });
    const producedIds = alreadyProduced.map(p => p.production_id);

    // 3. Pending = received but not yet processed in production entry
    const pendingIds = receivedIds.filter(id => !producedIds.includes(id));
    if (pendingIds.length === 0) return [];

    // 4. Fetch details
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
 * Create production entry record
 */
const createProductionEntry = async (data) => {
    const { productionId, actualQty, remarks, processedBy, bomConsumption } = data;

    return await prisma.productionEntry.create({
        data: {
            production_id: productionId,
            actual_qty: actualQty,
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
