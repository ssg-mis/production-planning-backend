const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dPlans = await prisma.dispatchPlanningPlant.findMany();
  console.log("Dispatch Planning Plant:");
  console.table(dPlans.map(d => ({id: d.production_id, actual_qty_kg: Number(d.actual_qty_kg)})));
  
  const indents = await prisma.productionIndent.findMany();
  console.log("\nProduction Indent:");
  console.table(indents.map(i => ({id: i.production_id, product: i.product_name, indent_qty: Number(i.indent_quantity), weight: Number(i.total_weight_kg)})));

  const receipts = await prisma.oilReceipt.findMany();
  console.log("\nOil Receipt:");
  console.table(receipts.map(r => ({id: r.production_id, received_qty: Number(r.received_qty)})));
}

main().catch(console.error).finally(() => prisma.$disconnect());
