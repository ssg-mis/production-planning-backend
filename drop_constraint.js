const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Dropping constraint...');
    await prisma.$executeRawUnsafe(`ALTER TABLE packing_raw_material_indent DROP CONSTRAINT IF EXISTS packing_raw_material_indent_production_id_key CASCADE;`);
    console.log('Constraint dropped successfully.');
  } catch (err) {
    console.error('Error dropping constraint:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
