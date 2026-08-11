import express from 'express';
import { logClient, logExtractedText, clearExtractedTextLog } from '../services/logService.js';

const router = express.Router();

// 1. Client log endpoint (POST /api/log/client)
router.post('/client', (req, res) => {
  const { level, message, data } = req.body;
  logClient(level || 'INFO', message, data);
  res.json({ success: true });
});

// 2. Append extracted text log (POST /api/log/extracted-text)
router.post('/extracted-text', async (req, res) => {
  const { fileName, pages, vendorName, vendor } = req.body;
  if (!fileName || !pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const vendorDisplay = vendorName || vendor || null;

  try {
    await logExtractedText(fileName, pages, vendorDisplay);
    res.json({ success: true });
  } catch (err) {
    console.error('Extracted text log error:', err);
    res.status(500).json({ error: 'Log write failed' });
  }
});

// 3. Clear extracted text log (DELETE /api/log/extracted-text)
router.delete('/extracted-text', async (req, res) => {
  try {
    await clearExtractedTextLog();
    res.json({ success: true });
  } catch (err) {
    console.error('Clear extracted text log error:', err);
    res.status(500).json({ error: 'Failed to clear log' });
  }
});

export default router;
