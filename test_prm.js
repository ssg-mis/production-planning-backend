require('dotenv').config();
const { prisma } = require('./src/config/db');

async function run() {
  try {
    const result = await prisma.packingRawMaterialIndent.create({
      data: {
        production_id: 'DEBUG-TEST-03',
        status: 'Allocated',
        bom_items: {
          create: [{
            production_id: 'DEBUG-TEST-03',
            item_name: 'Test Item',
            qty_required: 10,
            qty_allocated: 10
          }]
        }
      },
      include: {
        bom_items: true
      }
    });
    console.log('CREATED:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('PRISMA_ERROR_DETAILS:');
    console.dir(e, { depth: null });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
