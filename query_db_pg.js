const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Shrishyam001122@database-1.c5om42i2ygos.ap-south-1.rds.amazonaws.com:5432/production-planning?sslmode=no-verify'
});

async function run() {
  await client.connect();
  
  const dplans = await client.query('SELECT production_id, actual_qty_kg FROM dispatch_planning_plant');
  console.log("Dispatch Planning Plant:");
  console.table(dplans.rows);

  const indents = await client.query('SELECT production_id, indent_quantity, total_weight_kg FROM production_indent');
  console.log("Production Indent:");
  console.table(indents.rows);

  const receipts = await client.query('SELECT production_id, received_qty FROM oil_receipt');
  console.log("Oil Receipts:");
  console.table(receipts.rows);

  await client.end();
}
run();
