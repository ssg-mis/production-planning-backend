const { prisma } = require('../config/db');

/**
 * Get pending stock items:
 * Items from ProductionEntry with remaining quantity to be stocked in
 */
const getPendingStockIn = async () => {
    // 1. Get all production entries
    let productionEntries = [];
    try {
        productionEntries = await prisma.productionEntry.findMany({
            orderBy: { processed_date: 'desc' }
        });
    } catch (err) {
        console.error('Error fetching production entries for stock-in:', err.message);
        try {
            productionEntries = await prisma.$queryRawUnsafe(`SELECT * FROM production_entry ORDER BY processed_date DESC`);
        } catch (rawErr) {
            console.error('Raw fallback for stock-in production entries failed:', rawErr.message);
        }
    }
    if (productionEntries.length === 0) return [];

    // 2. Get all balance receipts (dependency)
    let balanceReceipts = [];
    try {
        balanceReceipts = await prisma.balanceMaterialReceipt.findMany({
            select: { entry_id: true }
        });
    } catch (err) {
        console.error('Error fetching balance receipts for stock-in:', err.message);
        try {
            balanceReceipts = await prisma.$queryRawUnsafe(`SELECT entry_id FROM balance_material_receipt`);
        } catch (rawErr) {
            console.error('Raw fallback for balance receipts failed:', rawErr.message);
        }
    }
    const balanceEntryIds = (balanceReceipts || []).map(r => r.entry_id).filter(Boolean);

    // 3. Get all stock_in records to calculate remaining quantities
    let allStockIn = [];
    try {
        allStockIn = await prisma.stockIn.findMany({
            select: { entry_id: true, accepted_qty: true }
        });
    } catch (err) {
        console.error('Error fetching all stock-in for pending calculation:', err.message);
        try {
            allStockIn = await prisma.$queryRawUnsafe(`SELECT entry_id, accepted_qty FROM stock_in`);
        } catch (rawErr) {
            console.error('Raw fallback for all stock-in failed:', rawErr.message);
        }
    }

    // 4. Calculate remaining quantity for each production entry
    const pending = productionEntries.map(entry => {
        const bom = entry.bom_consumption || [];
        const hasVariance = bom.some(item => (item.diff || 0) > 0 || (item.returned || 0) > 0 || (item.damaged || 0) > 0);

        if (hasVariance && !balanceEntryIds.includes(entry.id)) return null;

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
    let indents = [];
    try {
        indents = await prisma.productionIndent.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching production indents for stock-in:', err.message);
        try {
            const idList = productionIds.map(id => `'${id}'`).join(',');
            indents = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id IN (${idList})`);
        } catch (rawErr) {
            console.error('Raw fallback for production indents failed:', rawErr.message);
        }
    }

    try {
        if (productionIds.length > 0) {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT production_id, selected_skus 
                FROM packing_raw_material_indent 
                WHERE production_id IN (${productionIds.map(id => `'${id}'`).join(',')})
            `);
        }
    } catch (err) {
        console.error('Error fetching packing indents via raw SQL:', err.message);
    }

    return pending.map(entry => {
        const indent = indents.find(i => i.production_id === entry.production_id);
        const packingIndent = packingIndents.find(pi => pi.production_id === entry.production_id);
        return {
            ...entry,
            id: entry.id,
            entry_id: entry.id,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : '',
            status: 'Pending',
            selected_skus: packingIndent ? packingIndent.selected_skus : []
        };
    });
};

/**
 * Get stock in history
 */
const getStockInHistory = async () => {
    let history = [];
    try {
        history = await prisma.stockIn.findMany({
            orderBy: { received_date: 'desc' }
        });
    } catch (err) {
        console.error('Error fetching stock-in history:', err.message);
        try {
            history = await prisma.$queryRawUnsafe(`SELECT * FROM stock_in ORDER BY received_date DESC`);
        } catch (rawErr) {
            console.error('Raw fallback for stock-in history failed:', rawErr.message);
        }
    }

    const entryIds = (history || []).map(h => h.entry_id).filter(Boolean);
    let productionEntries = [];
    try {
        productionEntries = await prisma.productionEntry.findMany({
            where: { id: { in: entryIds } }
        });
    } catch (err) {
        console.error('Error fetching production entries for history:', err.message);
        if (entryIds.length > 0) {
            try {
                const idList = entryIds.join(',');
                productionEntries = await prisma.$queryRawUnsafe(`SELECT * FROM production_entry WHERE id IN (${idList})`);
            } catch (rawErr) {
                console.error('Raw fallback for production entries history failed:', rawErr.message);
            }
        }
    }

    const productionIds = [...new Set((history || []).map(h => h.production_id))];
    let indents = [];
    try {
        indents = await prisma.productionIndent.findMany({
            where: { production_id: { in: productionIds } }
        });
    } catch (err) {
        console.error('Error fetching production indents for history:', err.message);
        if (productionIds.length > 0) {
            try {
                const idList = productionIds.map(id => `'${id}'`).join(',');
                indents = await prisma.$queryRawUnsafe(`SELECT * FROM production_indent WHERE production_id IN (${idList})`);
            } catch (rawErr) {
                console.error('Raw fallback for production indents history failed:', rawErr.message);
            }
        }
    }

    try {
        if (productionIds.length > 0) {
            packingIndents = await prisma.$queryRawUnsafe(`
                SELECT production_id, selected_skus 
                FROM packing_raw_material_indent 
                WHERE production_id IN (${productionIds.map(id => `'${id}'`).join(',')})
            `);
        }
    } catch (err) {
        console.error('Error fetching packing indents for history via raw SQL:', err.message);
    }

    return history.map(h => {
        const indent = indents.find(i => i.production_id === h.production_id);
        const entry = productionEntries.find(p => p.id === h.entry_id);
        const packingIndent = packingIndents.find(pi => pi.production_id === h.production_id);
        return {
            ...h,
            productName: indent ? indent.product_name : 'Unknown',
            packingSize: indent ? indent.packing_size : '',
            partyName: indent ? indent.party_name : '',
            actualQtyProduced: entry ? Number(entry.actual_qty || 0) : 0,
            selected_skus: packingIndent ? packingIndent.selected_skus : []
        };
    });
};

/**
 * Create stock in record
 */
const createStockIn = async (data) => {
    const { productionId, entryId, finishedQty, acceptedQty, receivedBy, remarks } = data;

    const result = await prisma.stockIn.create({
        data: {
            production_id: productionId,
            // entry_id: entryId ? Number(entryId) : null,
            // finished_qty: Number(finishedQty) || null,
            // accepted_qty: Number(acceptedQty) || null,
            received_by: receivedBy,
            remarks: remarks,
            status: 'Accepted'
        }
    });

    // Update new columns via raw SQL
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE stock_in SET entry_id = $1, finished_qty = $2, accepted_qty = $3 WHERE id = $4`,
            entryId ? Number(entryId) : null,
            Number(finishedQty) || null,
            Number(acceptedQty) || null,
            result.id
        );
    } catch (err) {
        console.warn('Warning: Could not update Stock In new columns via raw SQL:', err.message);
    }

    return result;
};

/**
 * Bulk create stock in records
 */
const bulkCreateStockIn = async (items) => {
    return await prisma.$transaction(async (tx) => {
        const results = [];
        for (const item of items) {
            const result = await tx.stockIn.create({
                data: {
                    production_id: item.productionId,
                    // entry_id: item.entryId ? Number(item.entryId) : null,
                    // finished_qty: Number(item.finishedQty) || null,
                    // accepted_qty: Number(item.acceptedQty) || null,
                    received_by: item.receivedBy,
                    remarks: item.remarks || '',
                    status: 'Accepted'
                }
            });

            // Update new columns via raw SQL for each item
            await tx.$executeRawUnsafe(
                `UPDATE stock_in SET entry_id = $1, finished_qty = $2, accepted_qty = $3 WHERE id = $4`,
                item.entryId ? Number(item.entryId) : null,
                Number(item.finishedQty) || null,
                Number(item.acceptedQty) || null,
                result.id
            );
            results.push(result);
        }
        return results;
    });
};

module.exports = {
    getPendingStockIn,
    getStockInHistory,
    createStockIn,
    bulkCreateStockIn
};
