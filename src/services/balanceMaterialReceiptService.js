const { prisma } = require('../config/db');

/**
 * Get pending balance material receipts:
 * Items in production_entry with variance/returned BOM that are NOT yet fully processed in balance_material_receipt
 */
const getPendingBalanceReceipts = async () => {
    // 1. Get all production entries
    let productionEntries = [];
    try {
        productionEntries = await prisma.productionEntry.findMany({
            orderBy: { processed_date: 'desc' }
        });
    } catch (err) {
        console.error('Error fetching production entries for balance receipt:', err.message);
        try {
            productionEntries = await prisma.$queryRawUnsafe(`SELECT * FROM production_entry ORDER BY processed_date DESC`);
        } catch (rawErr) {
            console.error('Raw fallback for balance receipt production entries failed:', rawErr.message);
        }
    }

    // 2. Get all processed balance receipts
    const processedReceipts = await prisma.balanceMaterialReceipt.findMany({
        select: { entry_id: true }
    });
    const processedEntryIds = processedReceipts.map(r => r.entry_id).filter(Boolean);

    // 3. Filter entries that have variance and are not yet fully processed
    // (For now, one balance receipt per production entry is the simplifyed logic, 
    // but using entry_id for better tracking)
    const pending = productionEntries.filter(entry => {
        if (processedEntryIds.includes(entry.id)) return false;

        const bom = entry.bom_consumption || [];
        // Check if any BOM item has variance, returned or damaged quantity
        return bom.some(item => (item.diff || 0) > 0 || (item.returned || 0) > 0 || (item.damaged || 0) > 0);
    });

    if (pending.length === 0) return [];

    const productionIds = [...new Set(pending.map(p => p.production_id))];
    const indents = await prisma.productionIndent.findMany({
        where: { production_id: { in: productionIds } }
    });

    return pending.map(entry => {
        const indent = indents.find(i => i.production_id === entry.production_id);
        const bom = entry.bom_consumption || [];
        
        // Filter only items with variance/returns for display
        const varianceItems = bom.filter(item => (item.diff || 0) > 0 || (item.returned || 0) > 0 || (item.damaged || 0) > 0);

        return {
            ...entry,
            id: entry.id, // Use Entry ID for selection
            entry_id: entry.id,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : '',
            varianceItems
        };
    });
};

/**
 * Get balance material receipt history
 */
const getBalanceReceiptHistory = async () => {
    const history = await prisma.balanceMaterialReceipt.findMany({
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
            originalBom: entry ? entry.bom_consumption : []
        };
    });
};

/**
 * Create balance material receipt
 */
const createBalanceReceipt = async (data) => {
    const { productionId, entryId, receivedBy, remarks, materialReceipts } = data;

    return await prisma.balanceMaterialReceipt.create({
        data: {
            production_id: productionId,
            entry_id: entryId ? Number(entryId) : null,
            received_by: receivedBy,
            remarks: remarks,
            material_receipts: materialReceipts,
            status: 'Received'
        }
    });
};

module.exports = {
    getPendingBalanceReceipts,
    getBalanceReceiptHistory,
    createBalanceReceipt
};
