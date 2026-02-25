const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Shrishyam001122@database-1.c5om42i2ygos.ap-south-1.rds.amazonaws.com:5432/production-planning?sslmode=no-verify'
});

async function run() {
  await client.connect();
  await client.query('DELETE FROM packing_raw_material_bom');
  await client.end();
  console.log("Deleted old rows. Ready for migration.");
}
run();
