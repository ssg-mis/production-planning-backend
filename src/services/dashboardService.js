const { prisma, dispatchPrisma } = require('../config/db');

/**
 * Get all dashboard stats from DB
 * Model names from schema: ProductionIndent, IndentApproval, LabConfirmation,
 * OilReceipt, ProductionEntry, StockIn, RawMaterialReceipt
 */
const getDashboardStats = async () => {
  // ── KPI Counts ────────────────────────────────────────────────────

  // 1. Oil Indents Pending (submitted but NOT yet approved)
  const allIndents = await prisma.productionIndent.findMany({ select: { production_id: true } });
  const approvedIndents = await prisma.indentApproval.findMany({ select: { production_id: true } });
  const approvedIdSet = new Set(approvedIndents.map(a => a.production_id));
  const oilIndentsPending = allIndents.filter(i => !approvedIdSet.has(i.production_id)).length;

  // 2. Lab Confirmations Pending (approved but not yet lab-confirmed)
  const labDone = await prisma.labConfirmation.findMany({ select: { production_id: true } });
  const labDoneIdSet = new Set(labDone.map(l => l.production_id));
  const labPending = [...approvedIdSet].filter(id => !labDoneIdSet.has(id)).length;

  // 3. Production In Progress (oil received but not yet in production_entry)
  const oilReceipts = await prisma.oilReceipt.findMany({ select: { production_id: true } });
  const productionEntries = await prisma.productionEntry.findMany({ select: { production_id: true } });
  const producedIdSet = new Set(productionEntries.map(p => p.production_id));
  const productionInProgress = oilReceipts.filter(r => !producedIdSet.has(r.production_id)).length;

  // 4. Stock In (total completed)
  const stockInCount = await prisma.stockIn.count();

  // 5. Total orders pending (from dispatch DB if available)
  let ordersPending = 0;
  if (dispatchPrisma) {
    try {
      const result = await dispatchPrisma.$queryRaw`
        SELECT COUNT(*) as cnt FROM lift_receiving_confirmation
        WHERE planned_1 IS NOT NULL AND actual_1 IS NULL
      `;
      ordersPending = Number(result[0]?.cnt || 0);
    } catch (e) {
      ordersPending = 0;
    }
  }

  // ── Pipeline Summary ──────────────────────────────────────────────
  const totalIndents = allIndents.length;
  const totalApproved = approvedIndents.length;
  const totalLabDone = labDone.length;
  const totalOilReceipts = oilReceipts.length;
  const totalProduced = productionEntries.length;

  // ── Weekly Activity (last 7 days production entries) ─────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentProduction = await prisma.productionEntry.findMany({
    where: { processed_date: { gte: sevenDaysAgo } },
    orderBy: { processed_date: 'asc' }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLabel = days[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    const count = recentProduction.filter(p => {
      const pd = p.processed_date ? new Date(p.processed_date).toISOString().split('T')[0] : null;
      return pd === dateStr;
    }).length;
    last7.push({ date: dayLabel, completed: count });
  }

  // ── Oil type breakdown from production_indent (selected_oil field) ─
  const indentsWithOil = await prisma.productionIndent.findMany({
    select: { selected_oil: true }
  });

  const oilTypeMap = {};
  for (const i of indentsWithOil) {
    const type = i.selected_oil || 'Other';
    oilTypeMap[type] = (oilTypeMap[type] || 0) + 1;
  }
  const oilConsumption = Object.entries(oilTypeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    kpis: {
      ordersPending,
      oilIndentsPending,
      productionInProgress,
      stockInCount,
      labPending
    },
    pipeline: [
      { stage: 'Oil Indent', total: totalIndents, done: totalApproved, color: '#6366f1' },
      { stage: 'Lab', total: totalApproved, done: totalLabDone, color: '#8b5cf6' },
      { stage: 'Oil Receipt', total: totalLabDone, done: totalOilReceipts, color: '#0ea5e9' },
      { stage: 'Production', total: totalOilReceipts, done: totalProduced, color: '#10b981' },
      { stage: 'Stock In', total: totalProduced, done: stockInCount, color: '#f59e0b' },
    ],
    oilConsumption: oilConsumption.length
      ? oilConsumption
      : [{ name: 'No Data', value: 1 }],
    weeklyActivity: last7
  };
};

module.exports = { getDashboardStats };
