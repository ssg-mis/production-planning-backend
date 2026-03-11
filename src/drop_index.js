const { prisma } = require('./config/db');

async function main() {
  try {
    console.log('Attempting to drop unique constraint on packing_raw_material_indent.production_id...');
    
    // Check if the constraint exists first (PostgreSQL specific)
    const constraintExists = await prisma.$queryRaw`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'packing_raw_material_indent_production_id_key'
    `;

    if (constraintExists.length > 0) {
      await prisma.$executeRaw`ALTER TABLE "packing_raw_material_indent" DROP CONSTRAINT "packing_raw_material_indent_production_id_key"`;
      console.log('Successfully dropped unique constraint.');
    } else {
      console.log('Unique constraint "packing_raw_material_indent_production_id_key" not found.');
      
      // Alternative: Try to drop index if it's just an index
      try {
        await prisma.$executeRaw`DROP INDEX IF EXISTS "packing_raw_material_indent_production_id_key"`;
        console.log('Executed DROP INDEX IF EXISTS.');
      } catch (e) {
        console.log('Error dropping index:', e.message);
      }
    }
  } catch (error) {
    console.error('Error during database operation:', error.message);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
