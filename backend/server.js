/* global process */
// backend/server.js
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_PORT,
  REQUEST_BODY_LIMIT,
  LOG_DIR_NAME,
  SERVER_LOG_FILE,
  CLIENT_LOG_FILE,
  EXTRACTED_TEXT_LOG_FILE,
  OLLAMA_GENERATE_URL,
  OLLAMA_MODEL,
  OLLAMA_TEMPERATURE,
  AI_FALLBACK_TEXT_LIMIT,
  BID_FIELD_TO_COLUMN,
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;

app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true }));

// ========== LOGGING UTILITY ==========
const LOG_DIR = path.join(__dirname, LOG_DIR_NAME);
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logToFile(filename, message, data = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] ${message}`;
  if (data) {
    logEntry += `\n${JSON.stringify(data, null, 2)}`;
  }
  logEntry += '\n';
  const filePath = path.join(LOG_DIR, filename);
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) console.error('Log write failed:', err);
  });
}

// Server log
logToFile(SERVER_LOG_FILE, 'Server started');

// ========== CLIENT LOG ENDPOINT ==========
app.post('/api/log/client', (req, res) => {
  const { level, message, data } = req.body;
  const logMessage = `[CLIENT ${level}] ${message}`;
  logToFile(CLIENT_LOG_FILE, logMessage, data);
  res.json({ success: true });
});

// ========== TABLE INIT ==========
async function initDbTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id VARCHAR(100) PRIMARY KEY,
        tender_number VARCHAR(100) NOT NULL,
        item_title TEXT NOT NULL,
        division VARCHAR(200) DEFAULT 'Haldia Refinery Division',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('Tenders table initialization note:', err.message);
  }
}
initDbTables();

// ========== EXTRACTED TEXT LOG ENDPOINTS ==========
// Append extracted text (per page)
app.post('/api/log/extracted-text', (req, res) => {
  const { fileName, pages, vendorName, vendor } = req.body;
  if (!fileName || !pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const vendorDisplay = vendorName || vendor || null;
  const timestamp = new Date().toISOString();
  let logEntry = `\n--- ${timestamp} ---\nFILE: ${fileName}\n`;
  if (vendorDisplay) {
    logEntry += `VENDOR: ${vendorDisplay}\n`;
  }
  pages.forEach((page) => {
    logEntry += `\n--- PAGE ${page.pageIndex} ---\n${page.text}\n`;
  });
  logEntry += '\n';
  const filePath = path.join(LOG_DIR, EXTRACTED_TEXT_LOG_FILE);
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to log extracted text:', err);
      return res.status(500).json({ error: 'Log write failed' });
    }
    res.json({ success: true });
  });
});

// Clear extracted text log (called on wipe history)
app.delete('/api/log/extracted-text', (req, res) => {
  const filePath = path.join(LOG_DIR, EXTRACTED_TEXT_LOG_FILE);
  fs.truncate(filePath, 0, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to clear extracted text log:', err);
      return res.status(500).json({ error: 'Failed to clear log' });
    }
    if (err && err.code === 'ENOENT') {
      fs.writeFile(filePath, '', (writeErr) => {
        if (writeErr) console.error('Failed to create empty log file:', writeErr);
      });
    }
    res.json({ success: true });
  });
});

// ========== API ROUTES ==========

// 1. Fetch all records
app.get('/api/bids', async (req, res) => {
  logToFile(SERVER_LOG_FILE, 'GET /api/bids');
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
    logToFile(SERVER_LOG_FILE, `GET /api/bids - ${bids.length} records returned`);
    res.json(bids);
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `GET /api/bids ERROR: ${err.message}`);
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

// 2. Save batch extractions
app.post('/api/bids/bulk', async (req, res) => {
  const bids = req.body;
  logToFile(SERVER_LOG_FILE, `POST /api/bids/bulk - ${bids.length} records`);

  if (!Array.isArray(bids) || bids.length === 0) {
    logToFile(SERVER_LOG_FILE, 'POST /api/bids/bulk - Empty batch');
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
    logToFile(SERVER_LOG_FILE, `POST /api/bids/bulk - ${bids.length} records saved`);
    res.json({ message: 'Saved successfully', count: bids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    logToFile(SERVER_LOG_FILE, `POST /api/bids/bulk ERROR: ${err.message}`);
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Bulk insert failed' });
  } finally {
    client.release();
  }
});

// 3. AI Fallback
app.post('/api/extract-fallback', async (req, res) => {
  const { text } = req.body;
  logToFile(SERVER_LOG_FILE, 'POST /api/extract-fallback - AI fallback called');
  const truncatedText = text ? text.substring(0, AI_FALLBACK_TEXT_LIMIT) : '';

  const prompt = `Extract these 4 exact fields from the contract text:
1. woNumber: Contract/WO/GeM Number (e.g. GEMC-12345, WO-9988)
2. woValue: Total Value with taxes (e.g. 48,12,345.00 or Rs. 500000)
3. date: Contract Date (DD-MM-YYYY or DD-Mon-YYYY)
4. ministry: Buyer Ministry / Organization Name

If missing or unreadable, output "Not Found".

Text:
"""
${truncatedText}
"""`;

  try {
    const response = await fetch(OLLAMA_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: { temperature: OLLAMA_TEMPERATURE },
        format: {
          type: "object",
          properties: {
            woNumber: { type: "string" },
            woValue: { type: "string" },
            date: { type: "string" },
            ministry: { type: "string" }
          },
          required: ["woNumber", "woValue", "date", "ministry"]
        }
      })
    });

    if (!response.ok) {
      logToFile(SERVER_LOG_FILE, `POST /api/extract-fallback - Ollama returned ${response.status}`);
      return res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
    }

    const data = await response.json();
    let rawText = data.response;

    if (!rawText) {
      logToFile(SERVER_LOG_FILE, 'POST /api/extract-fallback - Empty response from Ollama');
      return res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
    }

    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    logToFile(SERVER_LOG_FILE, 'POST /api/extract-fallback - AI extracted successfully');
    res.json(parsed);
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `POST /api/extract-fallback ERROR: ${err.message}`);
    console.error("Ollama Local AI Fallback execution error:", err.message);
    res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
  }
});

// 4. Update single cell
app.put('/api/bids/:id', async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  logToFile(SERVER_LOG_FILE, `PUT /api/bids/${id} - field: ${field}`);

  const dbColumn = BID_FIELD_TO_COLUMN[field];
  if (!dbColumn) return res.status(400).json({ error: 'Invalid field mapping' });

  try {
    await pool.query(`UPDATE extracted_bids SET ${dbColumn} = $1 WHERE id = $2`, [value, id]);
    logToFile(SERVER_LOG_FILE, `PUT /api/bids/${id} - updated successfully`);
    res.json({ success: true });
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `PUT /api/bids/${id} ERROR: ${err.message}`);
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 5. Delete single record
app.delete('/api/bids/:id', async (req, res) => {
  const { id } = req.params;
  logToFile(SERVER_LOG_FILE, `DELETE /api/bids/${id}`);
  try {
    await pool.query('DELETE FROM extracted_bids WHERE id = $1', [id]);
    logToFile(SERVER_LOG_FILE, `DELETE /api/bids/${id} - deleted`);
    res.json({ success: true });
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `DELETE /api/bids/${id} ERROR: ${err.message}`);
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 6. Wipe all history
app.delete('/api/bids', async (req, res) => {
  logToFile(SERVER_LOG_FILE, 'DELETE /api/bids - Wiping all history');
  try {
    await pool.query('TRUNCATE TABLE extracted_bids');
    // Also clear the extracted text log
    const logFilePath = path.join(LOG_DIR, EXTRACTED_TEXT_LOG_FILE);
    fs.truncate(logFilePath, 0, (err) => {
      if (err && err.code !== 'ENOENT') {
        logToFile(SERVER_LOG_FILE, `Failed to clear extracted_text.log: ${err.message}`);
      }
    });
    logToFile(SERVER_LOG_FILE, 'DELETE /api/bids - history wiped');
    res.json({ success: true });
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `DELETE /api/bids ERROR: ${err.message}`);
    console.error('Truncate error:', err);
    res.status(500).json({ error: 'Wipe history failed' });
  }
});

// 7. Tenders management endpoints
app.get('/api/tenders', async (req, res) => {
  logToFile(SERVER_LOG_FILE, 'GET /api/tenders');
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
    logToFile(SERVER_LOG_FILE, `GET /api/tenders ERROR: ${err.message}`);
    res.status(500).json({ error: 'Database fetch tenders failed' });
  }
});

app.post('/api/tenders', async (req, res) => {
  const { id, tenderNumber, itemTitle, division } = req.body;
  logToFile(SERVER_LOG_FILE, `POST /api/tenders - ${tenderNumber}`);

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
    logToFile(SERVER_LOG_FILE, `POST /api/tenders ERROR: ${err.message}`);
    res.status(500).json({ error: 'Failed to create tender in database' });
  }
});

app.delete('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  logToFile(SERVER_LOG_FILE, `DELETE /api/tenders/${id}`);
  try {
    await pool.query('DELETE FROM tenders WHERE id = $1', [id]);
    logToFile(SERVER_LOG_FILE, `DELETE /api/tenders/${id} - deleted`);
    res.json({ success: true });
  } catch (err) {
    logToFile(SERVER_LOG_FILE, `DELETE /api/tenders/${id} ERROR: ${err.message}`);
    res.status(500).json({ error: 'Delete tender failed' });
  }
});

app.listen(PORT, () => {
  logToFile(SERVER_LOG_FILE, `Server listening on port ${PORT}`);
  console.log(`PostgreSQL API listening on port ${PORT}`);
});