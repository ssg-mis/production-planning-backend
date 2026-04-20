const { dispatchPrisma } = require('../config/db');

// Helper: get pool from dispatchPrisma adapter
const runQuery = async (sql, params = []) => {
  const result = await dispatchPrisma.$queryRawUnsafe(sql, ...params);
  return result;
};

/* ─────────────────── RAW MATERIAL ─────────────────── */
exports.getRawMaterials = async (req, res) => {
  try {
    const data = await runQuery('SELECT * FROM raw_material ORDER BY id');
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('[Master] getRawMaterials error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createRawMaterial = async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const data = await runQuery(
      `INSERT INTO raw_material (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] createRawMaterial error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const data = await runQuery(
      `UPDATE raw_material SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] updateRawMaterial error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM raw_material WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error) {
    console.error('[Master] deleteRawMaterial error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* ─────────────────── BOM ─────────────────── */
exports.getBOM = async (req, res) => {
  try {
    const data = await runQuery('SELECT * FROM bom ORDER BY id');
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('[Master] getBOM error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createBOM = async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const data = await runQuery(
      `INSERT INTO bom (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] createBOM error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateBOM = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const data = await runQuery(
      `UPDATE bom SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] updateBOM error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteBOM = async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM bom WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error) {
    console.error('[Master] deleteBOM error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* ─────────────────── LAB REPORT MASTER ─────────────────── */
exports.getLabReportMaster = async (req, res) => {
  try {
    const data = await runQuery('SELECT * FROM lab_report_master ORDER BY sn');
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('[Master] getLabReportMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createLabReportMaster = async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const data = await runQuery(
      `INSERT INTO lab_report_master (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] createLabReportMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateLabReportMaster = async (req, res) => {
  try {
    const { id } = req.params; // This will still match the :id in route, but we'll use it as 'sn'
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const data = await runQuery(
      `UPDATE lab_report_master SET ${setClauses} WHERE sn = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] updateLabReportMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteLabReportMaster = async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM lab_report_master WHERE sn = $1', [id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error) {
    console.error('[Master] deleteLabReportMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* ─────────────────── CHEMICAL ADDITIVES ─────────────────── */
exports.getChemicalAdditives = async (req, res) => {
  try {
    const data = await runQuery('SELECT * FROM chemical_additives ORDER BY id');
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('[Master] getChemicalAdditives error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createChemicalAdditive = async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const data = await runQuery(
      `INSERT INTO chemical_additives (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] createChemicalAdditive error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateChemicalAdditive = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const data = await runQuery(
      `UPDATE chemical_additives SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] updateChemicalAdditive error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteChemicalAdditive = async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM chemical_additives WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error) {
    console.error('[Master] deleteChemicalAdditive error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* ─────────────────── TANKER MASTER ─────────────────── */
exports.getTankerMaster = async (req, res) => {
  try {
    const data = await runQuery('SELECT * FROM tanker_master ORDER BY id');
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('[Master] getTankerMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createTankerMaster = async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const data = await runQuery(
      `INSERT INTO tanker_master (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] createTankerMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateTankerMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const data = await runQuery(
      `UPDATE tanker_master SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('[Master] updateTankerMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteTankerMaster = async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM tanker_master WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error) {
    console.error('[Master] deleteTankerMaster error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
