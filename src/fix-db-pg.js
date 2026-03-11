const { Pool } = require('pg');
require('dotenv').config();

// Use the same connection string logic as the app
const connectionString = process.env.DATABASE_URL;

async function fixDb() {
  console.log('Connecting to database...');
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false } // Force SSL for RDS
  });

  try {
    console.log('Adding selected_skus JSONB column to packing_raw_material_indent...');
    await pool.query('ALTER TABLE packing_raw_material_indent ADD COLUMN IF NOT EXISTS selected_skus JSONB;');
    console.log('✅ Column added successfully (or already existed).');

    // Also remove the unique constraint while we are at it
    console.log('Dropping unique constraint on production_id...');
    await pool.query('ALTER TABLE packing_raw_material_indent DROP CONSTRAINT IF EXISTS packing_raw_material_indent_production_id_key CASCADE;');
    console.log('✅ Constraint dropped successfully.');

  } catch (err) {
    console.error('❌ Error fixing DB:', err.message);
  } finally {
    await pool.end();
  }
}

fixDb();
