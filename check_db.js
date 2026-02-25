const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Shrishyam001122@database-1.c5om42i2ygos.ap-south-1.rds.amazonaws.com:5432/production-planning?sslmode=no-verify'
});

async function run() {
  await client.connect();
  const indents = await client.query('SELECT * FROM packing_raw_material_indent');
  const boms = await client.query('SELECT * FROM packing_raw_material_bom');
  console.log("Indents:", indents.rows);
  console.log("BOMs:", boms.rows);
  await client.end();
}
run();
