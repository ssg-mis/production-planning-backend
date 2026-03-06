const { prisma } = require('../config/db');

/**
 * Get pending stock items:
 * Items from ProductionEntry with remaining quantity to be stocked in
 */
const getPendingStockIn = async () => {
    // 1. Get all production entries
    const productionEntries = await prisma.productionEntry.findMany({
        orderBy: { processed_date: 'desc' }
    });
    if (productionEntries.length === 0) return [];

    // 2. Get all balance receipts (dependency)
    const balanceReceipts = await prisma.balanceMaterialReceipt.findMany({
        select: { entry_id: true }
    });
    const balanceEntryIds = balanceReceipts.map(r => r.entry_id).filter(Boolean);

    // 3. Get all stock_in records to calculate remaining quantities
    const allStockIn = await prisma.stockIn.findMany({
        select: { entry_id: true, accepted_qty: true }
    });

    // 4. Calculate remaining quantity for each production entry
    const pending = productionEntries.map(entry => {
        // Must have balance receipt first
        if (!balanceEntryIds.includes(entry.id)) return null;

        const matchingStockIn = allStockIn.filter(s => s.entry_id === entry.id);
        const totalStocked = matchingStockIn.reduce((acc, curr) => acc + Number(curr.accepted_qty || 0), 0);
        const remainingToStock = Number(entry.actual_qty || 0) - totalStocked;

        if (remainingToStock <= 0.01) return null; // Fully stocked

        return {
            ...entry,
            remaining_qty: remainingToStock,
            total_produced_qty: Number(entry.actual_qty || 0)
        };
    }).filter(Boolean);

    if (pending.length === 0) return [];

    const productionIds = [...new Set(pending.map(p => p.production_id))];
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    return pending.map(entry => {
        const indent = indents.find(i => i.production_id === entry.production_id);
        return {
            ...entry,
            id: entry.id, // Use Entry ID for selection
            entry_id: entry.id,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : '',
            status: 'Pending'
        };
    });
};

/**
 * Get stock in history
 */
const getStockInHistory = async () => {
    const history = await prisma.stockIn.findMany({
        orderBy: { received_date: 'desc' }
    });

    const entryIds = history.map(h => h.entry_id).filter(Boolean);
    const productionEntries = await prisma.productionEntry.findMany({
        where: { id: { in: entryIds } }
    });

    const productionIds = history.map(h => h.production_id);
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    return history.map(h => {
        const indent = indents.find(i => i.production_id === h.production_id);
        const entry = productionEntries.find(p => p.id === h.entry_id);
        return {
            ...h,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : '',
            actualQtyProduced: entry ? Number(entry.actual_qty || 0) : 0
        };
    });
};

/**
 * Create stock in record
 */
const createStockIn = async (data) => {
    const { productionId, entryId, finishedQty, acceptedQty, receivedBy, remarks } = data;

    return await prisma.stockIn.create({
        data: {
            production_id: productionId,
            entry_id: entryId ? Number(entryId) : null,
            finished_qty: Number(finishedQty) || null,
            accepted_qty: Number(acceptedQty) || null,
            received_by: receivedBy,
            remarks: remarks,
            status: 'Accepted'
        }
    });
};

/**
 * Bulk create stock in records
 */
const bulkCreateStockIn = async (items) => {
    return await prisma.$transaction(
        items.map(item => prisma.stockIn.create({
            data: {
                production_id: item.productionId,
                entry_id: item.entryId ? Number(item.entryId) : null,
                finished_qty: Number(item.finishedQty) || null,
                accepted_qty: Number(item.acceptedQty) || null,
                received_by: item.receivedBy,
                remarks: item.remarks || '',
                status: 'Accepted'
            }
        }))
    );
};

module.exports = {
    getPendingStockIn,
    getStockInHistory,
    createStockIn,
    bulkCreateStockIn
};
