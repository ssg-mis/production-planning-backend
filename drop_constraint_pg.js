const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  try {
    console.log('Dropping constraint...');
    // Drop the unique constraint
    await client.query(`ALTER TABLE packing_raw_material_indent DROP CONSTRAINT IF EXISTS packing_raw_material_indent_production_id_key CASCADE;`);
    console.log('Constraint dropped successfully.');
  } catch (err) {
    console.error('Error dropping constraint:', err.message);
  } finally {
    await client.end();
  }
}

main();
