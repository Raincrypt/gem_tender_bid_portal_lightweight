import express from 'express';
import { extractFallback } from '../services/aiService.js';

const router = express.Router();

// AI Fallback endpoint (POST /api/extract-fallback)
router.post('/extract-fallback', async (req, res) => {
  const { text } = req.body;
  const result = await extractFallback(text);
  res.json(result);
});

export default router;
