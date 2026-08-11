import express from 'express';
import { pool } from '../db/db.js';
import { logServer } from '../services/logService.js';

const router = express.Router();

// 1. Fetch all tenders (GET /api/tenders)
router.get('/', async (req, res) => {
  logServer('GET /api/tenders');
  try {
    const result = await pool.query('SELECT * FROM tenders ORDER BY created_at DESC');
    const tenders = result.rows.map(row => ({
      id: row.id,
      tenderNumber: row.tender_number,
      itemTitle: row.item_title,
      division: row.division,
      status: row.status,
      createdAt: row.created_at,
    }));
    res.json(tenders);
  } catch (err) {
    logServer(`GET /api/tenders ERROR: ${err.message}`);
    res.status(500).json({ error: 'Database fetch tenders failed' });
  }
});

// 2. Create or Update a tender (POST /api/tenders)
router.post('/', async (req, res) => {
  const { id, tenderNumber, itemTitle, division } = req.body;
  logServer(`POST /api/tenders - ${tenderNumber}`);

  if (!tenderNumber || !itemTitle) {
    return res.status(400).json({ error: 'Tender ID and Tender Item are required' });
  }

  const tenderId = id || `TND-${Date.now()}`;
  const tenderDiv = division || 'Haldia Refinery Division';

  try {
    const query = `
      INSERT INTO tenders (id, tender_number, item_title, division, status)
      VALUES ($1, $2, $3, $4, 'Active')
      ON CONFLICT (id) DO UPDATE SET
        tender_number = EXCLUDED.tender_number,
        item_title = EXCLUDED.item_title,
        division = EXCLUDED.division
      RETURNING *;
    `;
    const result = await pool.query(query, [tenderId, tenderNumber, itemTitle, tenderDiv]);
    const row = result.rows[0];
    const newTender = {
      id: row.id,
      tenderNumber: row.tender_number,
      itemTitle: row.item_title,
      division: row.division,
      status: row.status,
      createdAt: row.created_at,
    };
    res.json({ success: true, tender: newTender });
  } catch (err) {
    logServer(`POST /api/tenders ERROR: ${err.message}`);
    res.status(500).json({ error: 'Failed to create tender in database' });
  }
});

// 3. Delete a tender (DELETE /api/tenders/:id)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  logServer(`DELETE /api/tenders/${id}`);
  try {
    await pool.query('DELETE FROM tenders WHERE id = $1', [id]);
    logServer(`DELETE /api/tenders/${id} - deleted`);
    res.json({ success: true });
  } catch (err) {
    logServer(`DELETE /api/tenders/${id} ERROR: ${err.message}`);
    res.status(500).json({ error: 'Delete tender failed' });
  }
});

export default router;
