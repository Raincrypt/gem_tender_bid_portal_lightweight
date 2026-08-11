import express from 'express';
import { pool } from '../db/db.js';
import { BID_FIELD_TO_COLUMN } from '../config/config.js';
import { logServer, clearExtractedTextLog } from '../services/logService.js';

const router = express.Router();

// 1. Fetch all records (GET /api/bids)
router.get('/', async (req, res) => {
  logServer('GET /api/bids');
  try {
    const result = await pool.query('SELECT * FROM extracted_bids ORDER BY created_at DESC');
    const bids = result.rows.map(row => ({
      id: row.id,
      vendorFolder: row.vendor_folder,
      woNumber: row.wo_number,
      woValue: row.wo_value,
      date: row.date_str,
      dateVerified: row.date_verified,
      ministry: row.ministry,
      ministryVerified: row.ministry_verified,
      completionCertificate: row.completion_certificate,
      recommendation: row.recommendation,
      fileName: row.file_name,
      pageIndex: row.page_index
    }));
    logServer(`GET /api/bids - ${bids.length} records returned`);
    res.json(bids);
  } catch (err) {
    logServer(`GET /api/bids ERROR: ${err.message}`);
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

// 2. Save batch extractions (POST /api/bids/bulk)
router.post('/bulk', async (req, res) => {
  const bids = req.body;
  logServer(`POST /api/bids/bulk - ${bids.length} records`);

  if (!Array.isArray(bids) || bids.length === 0) {
    logServer('POST /api/bids/bulk - Empty batch');
    return res.status(400).json({ error: 'Empty batch provided' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO extracted_bids (
        id, vendor_folder, wo_number, wo_value, date_str, 
        date_verified, ministry, ministry_verified, 
        completion_certificate, recommendation, file_name, page_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        wo_number = EXCLUDED.wo_number,
        wo_value = EXCLUDED.wo_value,
        date_str = EXCLUDED.date_str,
        ministry = EXCLUDED.ministry;
    `;

    for (const row of bids) {
      await client.query(insertQuery, [
        row.id,
        row.vendorFolder || null,
        row.woNumber || 'Not Found',
        row.woValue || 'Not Found',
        row.date || 'Not Found',
        row.dateVerified || 'No',
        row.ministry || 'Not Found',
        row.ministryVerified || 'No',
        row.completionCertificate || 'No',
        row.recommendation || 'No',
        row.fileName || '',
        row.pageIndex || 1
      ]);
    }

    await client.query('COMMIT');
    logServer(`POST /api/bids/bulk - ${bids.length} records saved`);
    res.json({ message: 'Saved successfully', count: bids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    logServer(`POST /api/bids/bulk ERROR: ${err.message}`);
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Bulk insert failed' });
  } finally {
    client.release();
  }
});

// 3. Update single cell (PUT /api/bids/:id)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  logServer(`PUT /api/bids/${id} - field: ${field}`);

  const dbColumn = BID_FIELD_TO_COLUMN[field];
  if (!dbColumn) return res.status(400).json({ error: 'Invalid field mapping' });

  try {
    await pool.query(`UPDATE extracted_bids SET ${dbColumn} = $1 WHERE id = $2`, [value, id]);
    logServer(`PUT /api/bids/${id} - updated successfully`);
    res.json({ success: true });
  } catch (err) {
    logServer(`PUT /api/bids/${id} ERROR: ${err.message}`);
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 4. Delete single record (DELETE /api/bids/:id)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  logServer(`DELETE /api/bids/${id}`);
  try {
    await pool.query('DELETE FROM extracted_bids WHERE id = $1', [id]);
    logServer(`DELETE /api/bids/${id} - deleted`);
    res.json({ success: true });
  } catch (err) {
    logServer(`DELETE /api/bids/${id} ERROR: ${err.message}`);
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 5. Wipe all history (DELETE /api/bids)
router.delete('/', async (req, res) => {
  logServer('DELETE /api/bids - Wiping all history');
  try {
    await pool.query('TRUNCATE TABLE extracted_bids');
    // Also clear the extracted text log
    await clearExtractedTextLog();
    logServer('DELETE /api/bids - history wiped');
    res.json({ success: true });
  } catch (err) {
    logServer(`DELETE /api/bids ERROR: ${err.message}`);
    console.error('Truncate error:', err);
    res.status(500).json({ error: 'Wipe history failed' });
  }
});

export default router;
