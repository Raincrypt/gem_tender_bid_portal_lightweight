// backend/server.js
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ========== LOGGING UTILITY ==========
const LOG_DIR = path.join(__dirname, 'logs');
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
logToFile('server.log', 'Server started');

// ========== CLIENT LOG ENDPOINT ==========
app.post('/api/log/client', (req, res) => {
  const { level, message, data } = req.body;
  const logMessage = `[CLIENT ${level}] ${message}`;
  logToFile('client.log', logMessage, data);
  res.json({ success: true });
});

// ========== EXTRACTED TEXT LOG ENDPOINTS ==========
// Append extracted text (per page)
app.post('/api/log/extracted-text', (req, res) => {
  const { fileName, pages } = req.body;
  if (!fileName || !pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const timestamp = new Date().toISOString();
  let logEntry = `\n--- ${timestamp} ---\nFILE: ${fileName}\n`;
  pages.forEach((page) => {
    logEntry += `\n--- PAGE ${page.pageIndex} ---\n${page.text}\n`;
  });
  logEntry += '\n';
  const filePath = path.join(LOG_DIR, 'extracted_text.log');
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
  const filePath = path.join(LOG_DIR, 'extracted_text.log');
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
  logToFile('server.log', 'GET /api/bids');
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
    logToFile('server.log', `GET /api/bids - ${bids.length} records returned`);
    res.json(bids);
  } catch (err) {
    logToFile('server.log', `GET /api/bids ERROR: ${err.message}`);
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

// 2. Save batch extractions
app.post('/api/bids/bulk', async (req, res) => {
  const bids = req.body;
  logToFile('server.log', `POST /api/bids/bulk - ${bids.length} records`);

  if (!Array.isArray(bids) || bids.length === 0) {
    logToFile('server.log', 'POST /api/bids/bulk - Empty batch');
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
    logToFile('server.log', `POST /api/bids/bulk - ${bids.length} records saved`);
    res.json({ message: 'Saved successfully', count: bids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    logToFile('server.log', `POST /api/bids/bulk ERROR: ${err.message}`);
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Bulk insert failed' });
  } finally {
    client.release();
  }
});

// 3. AI Fallback
app.post('/api/extract-fallback', async (req, res) => {
  const { text } = req.body;
  logToFile('server.log', 'POST /api/extract-fallback - AI fallback called');
  const truncatedText = text ? text.substring(0, 3000) : '';

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
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        prompt: prompt,
        stream: false,
        options: { temperature: 0.0 },
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
      logToFile('server.log', `POST /api/extract-fallback - Ollama returned ${response.status}`);
      return res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
    }

    const data = await response.json();
    let rawText = data.response;

    if (!rawText) {
      logToFile('server.log', 'POST /api/extract-fallback - Empty response from Ollama');
      return res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
    }

    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    logToFile('server.log', 'POST /api/extract-fallback - AI extracted successfully');
    res.json(parsed);
  } catch (err) {
    logToFile('server.log', `POST /api/extract-fallback ERROR: ${err.message}`);
    console.error("Ollama Local AI Fallback execution error:", err.message);
    res.json({ woNumber: "Not Found", woValue: "Not Found", date: "Not Found", ministry: "Not Found" });
  }
});

// 4. Update single cell
app.put('/api/bids/:id', async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  logToFile('server.log', `PUT /api/bids/${id} - field: ${field}`);

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
    logToFile('server.log', `PUT /api/bids/${id} - updated successfully`);
    res.json({ success: true });
  } catch (err) {
    logToFile('server.log', `PUT /api/bids/${id} ERROR: ${err.message}`);
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 5. Delete single record
app.delete('/api/bids/:id', async (req, res) => {
  const { id } = req.params;
  logToFile('server.log', `DELETE /api/bids/${id}`);
  try {
    await pool.query('DELETE FROM extracted_bids WHERE id = $1', [id]);
    logToFile('server.log', `DELETE /api/bids/${id} - deleted`);
    res.json({ success: true });
  } catch (err) {
    logToFile('server.log', `DELETE /api/bids/${id} ERROR: ${err.message}`);
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 6. Wipe all history
app.delete('/api/bids', async (req, res) => {
  logToFile('server.log', 'DELETE /api/bids - Wiping all history');
  try {
    await pool.query('TRUNCATE TABLE extracted_bids');
    // Also clear the extracted text log
    const logFilePath = path.join(LOG_DIR, 'extracted_text.log');
    fs.truncate(logFilePath, 0, (err) => {
      if (err && err.code !== 'ENOENT') {
        logToFile('server.log', `Failed to clear extracted_text.log: ${err.message}`);
      }
    });
    logToFile('server.log', 'DELETE /api/bids - history wiped');
    res.json({ success: true });
  } catch (err) {
    logToFile('server.log', `DELETE /api/bids ERROR: ${err.message}`);
    console.error('Truncate error:', err);
    res.status(500).json({ error: 'Wipe history failed' });
  }
});

app.listen(PORT, () => {
  logToFile('server.log', `Server listening on port ${PORT}`);
  console.log(`PostgreSQL API listening on port ${PORT}`);
});