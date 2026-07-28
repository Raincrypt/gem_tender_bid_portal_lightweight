// backend/server.js
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Fetch all records
app.get('/api/bids', async (req, res) => {
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
    res.json(bids);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

// 2. Save batch extractions
app.post('/api/bids/bulk', async (req, res) => {
  const bids = req.body;
  if (!Array.isArray(bids) || bids.length === 0) {
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
    res.json({ message: 'Saved successfully', count: bids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Bulk insert failed' });
  } finally {
    client.release();
  }
});

// 🤖 3. AI FALLBACK ENDPOINT FOR 100% PARSING ACCURACY
app.post('/api/extract-fallback', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in backend/.env' });
  }

  const prompt = `
    You are an enterprise document parser specializing in Indian GeM, PSU (IOCL, Railways, Defence), and Commercial Work Order/Contract PDFs.
    Extract these 4 exact fields from the provided document page text:

    1. woNumber: Work Order / Contract / GEM Number (e.g., GEMC-5116877..., WO-12345, GEM/2024/...).
    2. woValue: Total Contract Value including taxes (e.g., 48,12,345.00 or Rs. 5,00,000). Return numeric/formatted string.
    3. date: Contract Generated / Issued Date (format as DD-MM-YYYY or DD-Mon-YYYY).
    4. ministry: Buyer Ministry / Division / Organisation Name.

    If a field is missing or ambiguous, output "Not Found".
    Return strict JSON only in this schema:
    {
      "woNumber": "string",
      "woValue": "string",
      "date": "string",
      "ministry": "string"
    }

    Text:
    """
    ${text}
    """
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawJson);
    res.json(parsed);
  } catch (err) {
    console.error("AI Fallback execution error:", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// 4. Update single cell/field
app.put('/api/bids/:id', async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  const columnMapping = {
    woNumber: 'wo_number',
    woValue: 'wo_value',
    date: 'date_str',
    dateVerified: 'date_verified',
    ministry: 'ministry',
    ministryVerified: 'ministry_verified',
    completionCertificate: 'completion_certificate',
    recommendation: 'recommendation'
  };

  const dbColumn = columnMapping[field];
  if (!dbColumn) return res.status(400).json({ error: 'Invalid field mapping' });

  try {
    await pool.query(`UPDATE extracted_bids SET ${dbColumn} = $1 WHERE id = $2`, [value, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 5. Delete single record
app.delete('/api/bids/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM extracted_bids WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 6. Wipe all history
app.delete('/api/bids', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE extracted_bids');
    res.json({ success: true });
  } catch (err) {
    console.error('Truncate error:', err);
    res.status(500).json({ error: 'Wipe history failed' });
  }
});

app.listen(PORT, () => console.log(`PostgreSQL API listening on port ${PORT}`));