const { prisma } = require('../config/db');

/**
 * Get pending stock items:
 * Items where ProductionEntry exists AND BalanceMaterialReceipt exists BUT NOT in StockIn
 */
const getPendingStockIn = async () => {
    // 1. Get all production entries
    const productionEntries = await prisma.productionEntry.findMany({
        orderBy: { processed_date: 'desc' }
    });

    // 2. Get all balance receipts
    const balanceReceipts = await prisma.balanceMaterialReceipt.findMany({
        select: { production_id: true }
    });
    const balanceReceiptIds = balanceReceipts.map(r => r.production_id);

    // 3. Get all items already in stock_in
    const alreadyInStock = await prisma.stockIn.findMany({
        select: { production_id: true }
    });
    const stockedIds = alreadyInStock.map(s => s.production_id);

    // 4. Pending = (ProductionEntry IDs) IN (BalanceReceipt IDs) AND NOT IN (StockIn IDs)
    const pendingEntries = productionEntries.filter(entry => 
        balanceReceiptIds.includes(entry.production_id) && !stockedIds.includes(entry.production_id)
    );

    if (pendingEntries.length === 0) return [];

    // 5. Fetch indent details for product names and party names
    const pendingIds = pendingEntries.map(e => e.production_id);
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: pendingIds } }
    });

    return pendingEntries.map(entry => {
        const indent = indents.find(i => i.production_id === entry.production_id);
        return {
            ...entry,
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

    const productionIds = history.map(h => h.production_id);
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    return history.map(h => {
        const indent = indents.find(i => i.production_id === h.production_id);
        return {
            ...h,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : ''
        };
    });
};

/**
 * Create stock in record (Accept items into stock)
 */
const createStockIn = async (data) => {
    const { productionId, finishedQty, acceptedQty, receivedBy, remarks } = data;

    return await prisma.stockIn.create({
        data: {
            production_id: productionId,
            finished_qty: finishedQty,
            accepted_qty: acceptedQty,
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
    // Prisma transaction for atomicity
    return await prisma.$transaction(
        items.map(item => prisma.stockIn.create({
            data: {
                production_id: item.productionId,
                finished_qty: item.finishedQty,
                accepted_qty: item.acceptedQty,
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
