-- Create production_indent table
CREATE TABLE IF NOT EXISTS production_indent (
  id SERIAL PRIMARY KEY,
  production_id TEXT UNIQUE NOT NULL,
  order_id TEXT,
  product_name TEXT,
  packing_size TEXT,
  packing_type TEXT,
  party_name TEXT,
  oil_required NUMERIC,
  selected_oil TEXT,
  indent_quantity NUMERIC,
  tank_no TEXT,
  status TEXT DEFAULT 'Submitted',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster production_id lookups
CREATE INDEX IF NOT EXISTS idx_production_indent_id ON production_indent(production_id);

-- Create index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_production_indent_order_id ON production_indent(order_id);
