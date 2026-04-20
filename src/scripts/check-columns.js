require('dotenv').config({ path: '.env' });
const { dispatchPrisma } = require('../config/db');

async function main() {
  const tables = ['raw_material', 'bom', 'lab_report_master', 'chemical_additives', 'tanker_master'];
  for (const table of tables) {
    try {
      console.log(`Checking table: ${table}`);
      const columns = await dispatchPrisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `);
      console.log(`Columns for ${table}:`, columns.map(c => c.column_name).join(', '));
    } catch (e) {
      console.error(`Error checking ${table}:`, e.message);
    }
  }
}

main().catch(console.error).finally(() => process.exit());
